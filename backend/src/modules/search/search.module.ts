import { Module } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators';

@Injectable()
class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(q: string, limit = 10) {
    if (!q || q.length < 2) return { data: { products: [], categories: [], brands: [] } };

    const [products, categories, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { tags: { has: q } },
          ],
        },
        take: limit,
        select: {
          id: true, name: true, slug: true, basePrice: true, salePrice: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
      this.prisma.category.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, name: true, slug: true, icon: true },
      }),
      this.prisma.brand.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, name: true, slug: true, logo: true },
      }),
    ]);

    return { data: { products, categories, brands, query: q } };
  }

  async getSuggestions(q: string) {
    if (!q || q.length < 2) return { data: [] };

    const products = await this.prisma.product.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      take: 8,
      select: { id: true, name: true, slug: true },
      orderBy: { totalSold: 'desc' },
    });

    return { data: products.map((p) => ({ id: p.id, text: p.name, slug: p.slug, type: 'product' })) };
  }
}

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public() @Get()
  search(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.search(q, limit);
  }

  @Public() @Get('suggestions')
  getSuggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q);
  }
}

@Module({ controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
