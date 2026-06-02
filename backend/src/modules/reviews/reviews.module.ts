import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, Min, Max, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Public, Roles } from '../../common/decorators';

class CreateReviewDto {
  @ApiProperty() @IsString() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(5) rating: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiProperty() @IsString() comment: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

@Injectable()
class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId: dto.productId, userId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this product');

    let isVerified = false;
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          userId,
          status: 'DELIVERED',
          items: { some: { productId: dto.productId } },
        },
      });
      isVerified = !!order;
    }

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        orderId: dto.orderId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        images: dto.images || [],
        isVerified,
        isApproved: false,
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
    });

    return { data: review, message: 'Review submitted for approval' };
  }

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.review.count({ where: { productId, isApproved: true } }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId, isApproved: true },
        _count: true,
      }),
    ]);

    const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: stats.find((s) => s.rating === r)?._count || 0,
    }));

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ratingDistribution,
      },
    };
  }

  async approveReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: true },
    });

    await this.updateProductRating(review.productId);

    return { data: null, message: 'Review approved' };
  }

  async deleteReview(reviewId: string, userId?: string) {
    const where: any = { id: reviewId };
    if (userId) where.userId = userId;

    const review = await this.prisma.review.findFirst({ where });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.updateProductRating(review.productId);

    return { data: null, message: 'Review deleted' };
  }

  private async updateProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: result._avg.rating || 0,
        totalReviews: result._count.id,
      },
    });
  }
}

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public() @Get('products/:productId')
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getProductReviews(productId, page, limit);
  }

  @Post() @ApiBearerAuth()
  createReview(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(userId, dto);
  }

  @Put(':id/approve') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  approveReview(@Param('id') id: string) {
    return this.reviewsService.approveReview(id);
  }

  @Delete(':id') @HttpCode(HttpStatus.OK) @ApiBearerAuth()
  deleteReview(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.reviewsService.deleteReview(id, ['ADMIN', 'SUPER_ADMIN'].includes(role) ? undefined : userId);
  }
}

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
