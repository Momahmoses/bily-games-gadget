import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { ScheduleModule } from '@nestjs/schedule';

class AdjustStockDto {
  @ApiProperty() @IsNumber() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getInventory(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true, name: true, sku: true,
              images: { where: { isPrimary: true }, take: 1 },
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getLowStockItems() {
    const items = await this.prisma.inventory.findMany({
      where: { trackStock: true, quantity: { lte: this.prisma.inventory.fields.lowStockAlert } },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });
    return { data: items };
  }

  async adjustStock(productId: string, dto: AdjustStockDto, adminId: string) {
    const inventory = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) throw new NotFoundException('Inventory record not found');

    const newQuantity = inventory.quantity + dto.quantity;
    if (newQuantity < 0) throw new NotFoundException('Insufficient stock for this adjustment');

    const updated = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.update({
        where: { productId },
        data: { quantity: newQuantity },
      });

      await tx.stockMovement.create({
        data: {
          inventoryId: inventory.id,
          type: dto.quantity > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(dto.quantity),
          note: dto.note,
          createdBy: adminId,
          reference: `ADJ-${Date.now()}`,
        },
      });

      return inv;
    });

    if (updated.quantity <= updated.lowStockAlert) {
      this.eventEmitter.emit('inventory.lowStock', { productId, quantity: updated.quantity });
    }

    return { data: updated, message: 'Stock adjusted successfully' };
  }

  async setLowStockAlert(productId: string, threshold: number) {
    const inv = await this.prisma.inventory.update({
      where: { productId },
      data: { lowStockAlert: threshold },
    });
    return { data: inv, message: 'Low stock alert updated' };
  }

  async getStockMovements(productId: string, page = 1, limit = 20) {
    const inventory = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) throw new NotFoundException('Product inventory not found');

    const skip = (page - 1) * limit;
    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { inventoryId: inventory.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where: { inventoryId: inventory.id } }),
    ]);

    return { data: movements, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStockAlerts() {
    const lowStockItems = await this.prisma.inventory.findMany({
      where: {
        trackStock: true,
        quantity: { gt: 0 },
      },
      include: { product: { select: { name: true, sku: true } } },
    });

    for (const item of lowStockItems) {
      if (item.quantity <= item.lowStockAlert) {
        this.eventEmitter.emit('inventory.lowStock', {
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          threshold: item.lowStockAlert,
        });
      }
    }
  }
}

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getInventory(page, limit, search);
  }

  @Get('low-stock')
  getLowStock() {
    return this.inventoryService.getLowStockItems();
  }

  @Post('products/:productId/adjust')
  adjustStock(
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
    @Query('adminId') adminId: string,
  ) {
    return this.inventoryService.adjustStock(productId, dto, adminId);
  }

  @Get('products/:productId/movements')
  getMovements(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getStockMovements(productId, page, limit);
  }
}

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
