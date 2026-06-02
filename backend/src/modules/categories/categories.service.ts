import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import slugify from 'slugify';

export class CreateCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDesc?: string;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeChildren = true) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: includeChildren
          ? {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                _count: { select: { products: true } },
              },
            }
          : false,
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: categories };
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return { data: category };
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    const category = await this.prisma.category.create({
      data: { ...dto, slug },
    });
    return { data: category, message: 'Category created' };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOneById(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    return { data: category, message: 'Category updated' };
  }

  async remove(id: string) {
    await this.findOneById(id);
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    return { data: null, message: 'Category deleted' };
  }

  private async findOneById(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let i = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
