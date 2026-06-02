import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators';

class CreateBannerDto {
  @IsString() title: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsString() image: string;
  @IsOptional() @IsString() mobileImage?: string;
  @IsOptional() @IsString() link?: string;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}

@Injectable()
class BannersService {
  constructor(private prisma: PrismaService) {}

  async findActive() {
    const banners = await this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: banners };
  }

  async findAll() {
    const banners = await this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: banners };
  }

  async create(dto: CreateBannerDto) {
    const banner = await this.prisma.banner.create({ data: { ...dto, isActive: dto.isActive ?? true } });
    return { data: banner, message: 'Banner created' };
  }

  async update(id: string, dto: Partial<CreateBannerDto>) {
    const banner = await this.prisma.banner.update({ where: { id }, data: dto });
    return { data: banner, message: 'Banner updated' };
  }

  async remove(id: string) {
    await this.prisma.banner.delete({ where: { id } });
    return { data: null, message: 'Banner deleted' };
  }
}

@ApiTags('Banners')
@Controller('banners')
@UseGuards(JwtAuthGuard, RolesGuard)
class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Public() @Get('active')
  findActive() { return this.bannersService.findActive(); }

  @Get('all') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  findAll() { return this.bannersService.findAll(); }

  @Post() @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  create(@Body() dto: CreateBannerDto) { return this.bannersService.create(dto); }

  @Put(':id') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateBannerDto>) { return this.bannersService.update(id, dto); }

  @Delete(':id') @Roles('ADMIN', 'SUPER_ADMIN') @HttpCode(HttpStatus.OK) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.bannersService.remove(id); }
}

@Module({ controllers: [BannersController], providers: [BannersService] })
export class BannersModule {}
