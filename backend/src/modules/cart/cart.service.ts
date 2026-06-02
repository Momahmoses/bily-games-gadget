import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty() @IsString() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty() @IsNumber() @Min(1) quantity: number;
}

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    const fullCart = await this.getFullCart(cart.id);
    return { data: this.computeCartTotals(fullCart) };
  }

  async addItem(dto: AddToCartDto, userId?: string, sessionId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isActive: true },
      include: { inventory: true, variants: { where: { id: dto.variantId || '' } } },
    });

    if (!product) throw new NotFoundException('Product not found or unavailable');

    let price = Number(product.salePrice || product.basePrice);
    let availableStock = product.inventory?.quantity || 0;

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId, isActive: true },
        include: { inventory: true },
      });
      if (!variant) throw new NotFoundException('Product variant not found');
      price = Number(variant.salePrice || variant.price);
      availableStock = variant.inventory?.quantity || availableStock;
    }

    if (product.inventory?.trackStock && availableStock < dto.quantity) {
      throw new BadRequestException(
        `Only ${availableStock} units available in stock`,
      );
    }

    const cart = await this.findOrCreateCart(userId, sessionId);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: dto.productId, variantId: dto.variantId || null },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (product.inventory?.trackStock && availableStock < newQty) {
        throw new BadRequestException(`Only ${availableStock} units available`);
      }
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty, price },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId || null,
          quantity: dto.quantity,
          price,
        },
      });
    }

    const updatedCart = await this.getFullCart(cart.id);
    return { data: this.computeCartTotals(updatedCart), message: 'Item added to cart' };
  }

  async updateItem(itemId: string, dto: UpdateCartItemDto, userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: { include: { inventory: true } } },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    if (item.product.inventory?.trackStock && item.product.inventory.quantity < dto.quantity) {
      throw new BadRequestException(`Only ${item.product.inventory.quantity} units available`);
    }

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });

    const updatedCart = await this.getFullCart(cart.id);
    return { data: this.computeCartTotals(updatedCart), message: 'Cart updated' };
  }

  async removeItem(itemId: string, userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    const updatedCart = await this.getFullCart(cart.id);
    return { data: this.computeCartTotals(updatedCart), message: 'Item removed' };
  }

  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { data: { items: [], subtotal: 0, itemCount: 0 }, message: 'Cart cleared' };
  }

  async mergeGuestCart(sessionId: string, userId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await this.findOrCreateCart(userId);

    for (const item of guestCart.items) {
      const existing = await this.prisma.cartItem.findFirst({
        where: { cartId: userCart.id, productId: item.productId, variantId: item.variantId },
      });

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }

  private async findOrCreateCart(userId?: string, sessionId?: string) {
    if (userId) {
      return this.prisma.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    }

    if (sessionId) {
      return this.prisma.cart.upsert({
        where: { sessionId },
        update: {},
        create: { sessionId },
      });
    }

    return this.prisma.cart.create({ data: {} });
  }

  private async getFullCart(cartId: string) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                inventory: { select: { quantity: true } },
              },
            },
            variant: { select: { id: true, name: true, options: true, price: true, salePrice: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private computeCartTotals(cart: any) {
    if (!cart) return { items: [], subtotal: 0, itemCount: 0 };

    const subtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return { ...cart, subtotal, itemCount };
  }
}
