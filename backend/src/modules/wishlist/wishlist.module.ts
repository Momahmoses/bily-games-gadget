import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@Injectable()
class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            inventory: { select: { quantity: true } },
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: items };
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    try {
      const item = await this.prisma.wishlist.create({
        data: { userId, productId },
        include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
      });
      return { data: item, message: 'Added to wishlist' };
    } catch {
      throw new ConflictException('Product already in wishlist');
    }
  }

  async removeFromWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Wishlist item not found');

    await this.prisma.wishlist.delete({
      where: { userId_productId: { userId, productId } },
    });
    return { data: null, message: 'Removed from wishlist' };
  }

  async checkWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { data: { inWishlist: !!item } };
  }
}

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get() getWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post(':productId') addToWishlist(@Param('productId') productId: string, @CurrentUser('id') userId: string) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId') @HttpCode(HttpStatus.OK)
  removeFromWishlist(@Param('productId') productId: string, @CurrentUser('id') userId: string) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Get('check/:productId')
  checkWishlist(@Param('productId') productId: string, @CurrentUser('id') userId: string) {
    return this.wishlistService.checkWishlist(userId, productId);
  }
}

@Module({ controllers: [WishlistController], providers: [WishlistService] })
export class WishlistModule {}
