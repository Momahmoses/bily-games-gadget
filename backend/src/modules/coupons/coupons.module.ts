import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponType } from '@prisma/client';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators';
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, IsPositive } from 'class-validator';

class CreateCouponDto {
  @IsString() code: string;
  @IsOptional() @IsString() description?: string;
  code_type: CouponType;
  @IsNumber() @IsPositive() value: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsNumber() maxDiscount?: number;
  @IsOptional() @IsNumber() usageLimit?: number;
  @IsOptional() @IsNumber() perUserLimit?: number;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or expired coupon code');

    const now = new Date();
    if (coupon.startDate > now) throw new BadRequestException('Coupon is not yet active');
    if (coupon.endDate < now) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    return {
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount,
      },
    };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true } } },
      }),
      this.prisma.coupon.count(),
    ]);
    return { data: coupons, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(dto: CreateCouponDto) {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        type: dto.code_type,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
      },
    });
    return { data: coupon, message: 'Coupon created' };
  }

  async update(id: string, dto: Partial<CreateCouponDto>) {
    const coupon = await this.prisma.coupon.update({ where: { id }, data: dto });
    return { data: coupon, message: 'Coupon updated' };
  }

  async remove(id: string) {
    await this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return { data: null, message: 'Coupon deactivated' };
  }
}

@ApiTags('Coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Public() @Get('validate/:code')
  validateCoupon(@Param('code') code: string) { return this.couponsService.validateCoupon(code); }

  @Get('admin') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  findAll(@Query('page') page?: number) { return this.couponsService.findAll(page); }

  @Post('admin') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  create(@Body() dto: CreateCouponDto) { return this.couponsService.create(dto); }

  @Put('admin/:id') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) { return this.couponsService.update(id, dto); }

  @Delete('admin/:id') @Roles('ADMIN', 'SUPER_ADMIN') @HttpCode(HttpStatus.OK) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.couponsService.remove(id); }
}

@Module({ controllers: [CouponsController], providers: [CouponsService] })
export class CouponsModule {}
