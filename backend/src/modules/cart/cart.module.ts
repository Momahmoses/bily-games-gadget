import { Module } from '@nestjs/common';
import { CartService, AddToCartDto, UpdateCartItemDto } from './cart.service';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators';
import { Request } from 'express';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('id') userId: string, @Req() req: Request) {
    return this.cartService.getCart(userId, req.headers['x-session-id'] as string);
  }

  @Post('items')
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.cartService.addItem(dto, userId, req.headers['x-session-id'] as string);
  }

  @Put('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.cartService.updateItem(itemId, dto, userId, req.headers['x-session-id'] as string);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.cartService.removeItem(itemId, userId, req.headers['x-session-id'] as string);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@CurrentUser('id') userId: string, @Req() req: Request) {
    return this.cartService.clearCart(userId, req.headers['x-session-id'] as string);
  }
}

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
