import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException('A product with this SKU already exists');

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDesc: dto.shortDesc,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        basePrice: dto.basePrice,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        sku: dto.sku,
        barcode: dto.barcode,
        weight: dto.weight,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        isDigital: dto.isDigital ?? false,
        tags: dto.tags || [],
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        attributes: dto.attributes
          ? { create: dto.attributes }
          : undefined,
        variants: dto.variants
          ? {
              create: dto.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice,
                options: v.options,
                image: v.image,
                isActive: v.isActive ?? true,
              })),
            }
          : undefined,
        inventory: {
          create: {
            quantity: dto.initialStock ?? 0,
            trackStock: true,
          },
        },
      },
      include: this.productInclude(),
    });

    return { data: product, message: 'Product created successfully' };
  }

  async findAll(query: ProductQueryDto) {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      isFeatured,
      page = 1,
      limit = 20,
      sortBy = 'newest',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (category) {
      const cat = await this.prisma.category.findFirst({
        where: { OR: [{ id: category }, { slug: category }] },
        include: { children: true },
      });
      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map((c) => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    if (brand) {
      where.brand = { OR: [{ id: brand }, { slug: brand }] };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) where.basePrice.gte = minPrice;
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
    }

    if (minRating !== undefined) {
      where.averageRating = { gte: minRating };
    }

    if (inStock) {
      where.inventory = { quantity: { gt: 0 } };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    const orderBy = this.buildOrderBy(sortBy);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.productListInclude(),
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      include: this.productInclude(),
    });

    if (!product) throw new NotFoundException('Product not found');
    return { data: product };
  }

  async findFeatured(limit = 8) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: this.productListInclude(),
    });
    return { data: products };
  }

  async findRelated(productId: string, limit = 6) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, brandId: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { brandId: product.brandId },
        ],
      },
      take: limit,
      orderBy: { totalSold: 'desc' },
      include: this.productListInclude(),
    });

    return { data: products };
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.sku && dto.sku !== product.sku) {
      const conflict = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
      if (conflict) throw new ConflictException('SKU already in use');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        shortDesc: dto.shortDesc,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        basePrice: dto.basePrice,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        sku: dto.sku,
        barcode: dto.barcode,
        weight: dto.weight,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
        isDigital: dto.isDigital,
        tags: dto.tags,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
      },
      include: this.productInclude(),
    });

    return { data: updated, message: 'Product updated successfully' };
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { data: null, message: 'Product deleted successfully' };
  }

  async addImages(productId: string, images: Array<{ url: string; publicId?: string; altText?: string }>) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existingImages = await this.prisma.productImage.count({ where: { productId } });

    const created = await this.prisma.$transaction(
      images.map((img, i) =>
        this.prisma.productImage.create({
          data: {
            productId,
            url: img.url,
            publicId: img.publicId,
            altText: img.altText || product.name,
            isPrimary: existingImages === 0 && i === 0,
            sortOrder: existingImages + i,
          },
        }),
      ),
    );

    return { data: created, message: 'Images added successfully' };
  }

  async deleteImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image not found');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { data: null, message: 'Image deleted' };
  }

  async getAdminProducts(query: ProductQueryDto) {
    const { search, category, brand, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;
    if (brand) where.brandId = brand;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          inventory: { select: { quantity: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private buildOrderBy(sortBy: string): Prisma.ProductOrderByWithRelationInput {
    switch (sortBy) {
      case 'price_asc': return { basePrice: 'asc' };
      case 'price_desc': return { basePrice: 'desc' };
      case 'oldest': return { createdAt: 'asc' };
      case 'rating': return { averageRating: 'desc' };
      case 'popular': return { totalSold: 'desc' };
      default: return { createdAt: 'desc' };
    }
  }

  private productListInclude() {
    return {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      images: { where: { isPrimary: true }, take: 1 },
      inventory: { select: { quantity: true } },
    };
  }

  private productInclude() {
    return {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true, logo: true } },
      images: { orderBy: { sortOrder: 'asc' as const } },
      variants: {
        where: { isActive: true },
        include: { inventory: true },
        orderBy: { sortOrder: 'asc' as const },
      },
      inventory: true,
      attributes: true,
      reviews: {
        where: { isApproved: true },
        take: 5,
        orderBy: { createdAt: 'desc' as const },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
      },
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }
}
