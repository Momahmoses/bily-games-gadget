import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators';
import slugify from 'slugify';

class CreateBrandDto {
  @IsString() name: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = false) {
    const brands = await this.prisma.brand.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return { data: brands };
  }

  async findOne(idOrSlug: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return { data: brand };
  }

  async create(dto: CreateBrandDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A brand with this name already exists');
    const brand = await this.prisma.brand.create({
      data: { ...dto, slug, isActive: dto.isActive ?? true },
    });
    return { data: brand, message: 'Brand created' };
  }

  async update(id: string, dto: Partial<CreateBrandDto>) {
    const brand = await this.prisma.brand.update({ where: { id }, data: dto });
    return { data: brand, message: 'Brand updated' };
  }

  async remove(id: string) {
    await this.prisma.brand.delete({ where: { id } });
    return { data: null, message: 'Brand deleted' };
  }
}

@ApiTags('Brands')
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public() @Get()
  findAll() { return this.brandsService.findAll(true); }

  @Get('all') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  findAllAdmin() { return this.brandsService.findAll(false); }

  @Public() @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) { return this.brandsService.findOne(idOrSlug); }

  @Post() @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  create(@Body() dto: CreateBrandDto) { return this.brandsService.create(dto); }

  @Put(':id') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateBrandDto>) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id') @Roles('ADMIN', 'SUPER_ADMIN') @HttpCode(HttpStatus.OK) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.brandsService.remove(id); }
}

@Module({ controllers: [BrandsController], providers: [BrandsService], exports: [BrandsService] })
export class BrandsModule {}
