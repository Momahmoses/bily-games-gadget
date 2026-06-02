import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Controller, Get, Put, Delete, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';

class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatar?: string;
}

class CreateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() phone: string;
  @IsString() address: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@Injectable()
class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatar: true, role: true, emailVerified: true, createdAt: true,
        _count: { select: { orders: true, wishlists: true, reviews: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { data: user };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true,
      },
    });
    return { data: user, message: 'Profile updated' };
  }

  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    return { data: addresses };
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: { ...dto, userId, country: 'Nigeria' },
    });
    return { data: address, message: 'Address added' };
  }

  async updateAddress(userId: string, addressId: string, dto: Partial<CreateAddressDto>) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({ where: { id: addressId }, data: dto });
    return { data: updated, message: 'Address updated' };
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { data: null, message: 'Address deleted' };
  }

  // Admin operations
  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { role: 'CUSTOMER' };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          isActive: true, createdAt: true, lastLoginAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    return { data: updated, message: `User ${updated.isActive ? 'activated' : 'deactivated'}` };
  }
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile') getProfile(@CurrentUser('id') userId: string) { return this.usersService.getProfile(userId); }
  @Put('profile') updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) { return this.usersService.updateProfile(userId, dto); }
  @Get('addresses') getAddresses(@CurrentUser('id') userId: string) { return this.usersService.getAddresses(userId); }
  @Post('addresses') createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) { return this.usersService.createAddress(userId, dto); }
  @Put('addresses/:id') updateAddress(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: Partial<CreateAddressDto>) { return this.usersService.updateAddress(userId, id, dto); }
  @Delete('addresses/:id') @HttpCode(HttpStatus.OK) deleteAddress(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.usersService.deleteAddress(userId, id); }

  @Get('admin') @Roles('ADMIN', 'SUPER_ADMIN')
  getAllUsers(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.usersService.getAllUsers(page, limit, search);
  }

  @Put('admin/:id/toggle-status') @Roles('ADMIN', 'SUPER_ADMIN') @HttpCode(HttpStatus.OK)
  toggleStatus(@Param('id') id: string) { return this.usersService.toggleUserStatus(id); }
}

@Module({ controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
