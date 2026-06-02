import { Module } from '@nestjs/common';
import { OrdersService, CreateOrderDto, UpdateOrderStatusDto } from './orders.service';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get('my-orders')
  getMyOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getUserOrders(userId, page, limit);
  }

  @Get('my-orders/:id')
  getMyOrder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.getOrderById(id, userId);
  }

  @Put('my-orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.cancelOrder(id, userId);
  }

  @Get('admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAdminOrders(@Query() query: any) {
    return this.ordersService.getAdminOrders(query);
  }

  @Get('admin/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getOrderAdmin(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Put('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, adminId);
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
