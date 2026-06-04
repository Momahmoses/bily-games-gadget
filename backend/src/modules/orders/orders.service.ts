import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class CreateOrderDto {
  @ApiProperty() @IsString() addressId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingNotes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackingCode?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { inventory: true } },
            variant: { include: { inventory: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Shipping address not found');

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException(`Product "${item.product.name}" is no longer available`);
      }
      const stock = item.variantId
        ? item.variant?.inventory?.quantity || 0
        : item.product.inventory?.quantity || 0;

      if (item.product.inventory?.trackStock && stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Only ${stock} available.`,
        );
      }
    }

    let discount = 0;
    let couponId: string | undefined;

    if (dto.couponCode) {
      const couponResult = await this.validateCoupon(dto.couponCode, userId, cart);
      discount = couponResult.discount;
      couponId = couponResult.couponId;
    }

    const settings = await this.prisma.setting.findMany({
      where: { key: { in: ['shipping_fee', 'tax_rate', 'free_shipping_threshold'] } },
    });

    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const shippingFeeBase = parseFloat(settingsMap.shipping_fee || '2500');
    const freeShippingThreshold = parseFloat(settingsMap.free_shipping_threshold || '50000');
    const taxRate = parseFloat(settingsMap.tax_rate || '0') / 100;

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const shippingFee = subtotal >= freeShippingThreshold ? 0 : shippingFeeBase;
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + shippingFee + tax;

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          couponId,
          subtotal,
          discount,
          shippingFee,
          tax,
          total,
          shippingNotes: dto.shippingNotes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.product.name,
              sku: item.product.sku,
              options: item.variant?.options || undefined,
              image: undefined,
              price: item.price,
              quantity: item.quantity,
              total: Number(item.price) * item.quantity,
            })),
          },
          timeline: {
            create: {
              status: OrderStatus.PENDING,
              comment: 'Order placed successfully',
              isPublic: true,
            },
          },
        },
        include: this.orderInclude(),
      });

      for (const item of cart.items) {
        if (item.variantId) {
          await tx.variantInventory.updateMany({
            where: { variantId: item.variantId },
            data: { reservedQty: { increment: item.quantity } },
          });
        } else if (item.product.inventory) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reservedQty: { increment: item.quantity } },
          });
        }
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    this.eventEmitter.emit('order.created', { order, userId });

    return { data: order, message: 'Order placed successfully' };
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
            },
          },
          address: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderById(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: this.orderInclude(),
    });

    if (!order) throw new NotFoundException('Order not found');
    return { data: order };
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, adminId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    this.validateStatusTransition(order.status, dto.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          trackingCode: dto.trackingCode,
          deliveredAt: dto.status === OrderStatus.DELIVERED ? new Date() : undefined,
        },
        include: this.orderInclude(),
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: dto.status,
          comment: dto.comment,
          createdBy: adminId,
        },
      });

      return updatedOrder;
    });

    if (dto.status === OrderStatus.PAID) {
      await this.releaseReservedInventoryAndDeduct(orderId);
    } else if (dto.status === OrderStatus.CANCELLED) {
      await this.releaseReservedInventory(orderId);
    }

    this.eventEmitter.emit('order.statusChanged', { order: updated, newStatus: dto.status });

    return { data: updated, message: 'Order status updated' };
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (!['PENDING', 'PAID'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          comment: 'Cancelled by customer',
          createdBy: userId,
        },
      });

      for (const item of order.items) {
        if (item.variantId) {
          await tx.variantInventory.updateMany({
            where: { variantId: item.variantId },
            data: { reservedQty: { decrement: item.quantity } },
          });
        } else {
          await tx.inventory.updateMany({
            where: { productId: item.productId },
            data: { reservedQty: { decrement: item.quantity } },
          });
        }
      }
    });

    this.eventEmitter.emit('order.cancelled', { orderId, userId });

    return { data: null, message: 'Order cancelled successfully' };
  }

  async getAdminOrders(query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: { select: { id: true, name: true, quantity: true, total: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async releaseReservedInventory(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    for (const item of order.items) {
      if (item.variantId) {
        await this.prisma.variantInventory.updateMany({
          where: { variantId: item.variantId },
          data: { reservedQty: { decrement: item.quantity } },
        });
      } else {
        await this.prisma.inventory.updateMany({
          where: { productId: item.productId },
          data: { reservedQty: { decrement: item.quantity } },
        });
      }
    }
  }

  private async releaseReservedInventoryAndDeduct(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    for (const item of order.items) {
      if (item.variantId) {
        await this.prisma.variantInventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            quantity: { decrement: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      } else {
        await this.prisma.inventory.updateMany({
          where: { productId: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      }

      await this.prisma.product.update({
        where: { id: item.productId },
        data: { totalSold: { increment: item.quantity } },
      });
    }
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
      PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      SHIPPED: [OrderStatus.DELIVERED],
      DELIVERED: [OrderStatus.REFUNDED],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!transitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${next}`,
      );
    }
  }

  private async validateCoupon(code: string, userId: string, cart: any) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or expired coupon');

    const now = new Date();
    if (coupon.startDate > now || coupon.endDate < now) {
      throw new BadRequestException('Coupon is not active');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const subtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount of ₦${coupon.minOrderAmount} required`,
      );
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else if (coupon.type === 'FIXED') {
      discount = Math.min(Number(coupon.value), subtotal);
    }

    return { discount, couponId: coupon.id };
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `BGG${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.order.count({
      where: { orderNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  private orderInclude() {
    return {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      address: true,
      coupon: { select: { code: true, type: true, value: true } },
      items: {
        include: {
          product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
          variant: { select: { id: true, name: true, options: true } },
        },
      },
      payments: { orderBy: { createdAt: 'desc' as const } },
      timeline: { orderBy: { createdAt: 'desc' as const } },
    };
  }
}
