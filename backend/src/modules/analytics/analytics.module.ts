import { Module } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';

@Injectable()
class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      totalRevenue,
      monthRevenue,
      todayRevenue,
      totalOrders,
      pendingOrders,
      processingOrders,
      totalProducts,
      activeProducts,
      totalCustomers,
      newCustomersThisMonth,
      totalReviews,
      pendingReviews,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: startOfDay } },
        _sum: { total: true },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { isApproved: false } }),
    ]);

    return {
      data: {
        revenue: {
          total: totalRevenue._sum.total || 0,
          monthly: monthRevenue._sum.total || 0,
          daily: todayRevenue._sum.total || 0,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth,
        },
        reviews: {
          total: totalReviews,
          pending: pendingReviews,
        },
      },
    };
  }

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = 'day';
    }

    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        createdAt: { gte: startDate },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const chartData = this.groupOrdersByPeriod(orders, groupBy, startDate, now);
    return { data: chartData };
  }

  async getTopProducts(limit = 10) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { totalSold: 'desc' },
      take: limit,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true } },
      },
    });
    return { data: products };
  }

  async getOrderStatusDistribution() {
    const distribution = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });
    return { data: distribution };
  }

  async getRecentOrders(limit = 10) {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { items: true } },
      },
    });
    return { data: orders };
  }

  async getCategoryRevenue() {
    const result = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { total: true },
      _count: { id: true },
    });

    const productsWithCategories = await this.prisma.product.findMany({
      where: { id: { in: result.map((r) => r.productId) } },
      include: { category: { select: { name: true } } },
    });

    const categoryMap = new Map<string, { revenue: number; count: number }>();
    for (const item of result) {
      const product = productsWithCategories.find((p) => p.id === item.productId);
      const categoryName = product?.category?.name || 'Unknown';
      const existing = categoryMap.get(categoryName) || { revenue: 0, count: 0 };
      categoryMap.set(categoryName, {
        revenue: existing.revenue + Number(item._sum.total || 0),
        count: existing.count + (item._count.id || 0),
      });
    }

    const data = Array.from(categoryMap.entries()).map(([name, stats]) => ({
      category: name,
      ...stats,
    }));

    return { data: data.sort((a, b) => b.revenue - a.revenue) };
  }

  private groupOrdersByPeriod(orders: any[], groupBy: string, start: Date, end: Date) {
    const data: Array<{ label: string; revenue: number; orders: number }> = [];

    if (groupBy === 'day') {
      const current = new Date(start);
      while (current <= end) {
        const dayStr = current.toISOString().split('T')[0];
        const dayOrders = orders.filter(
          (o) => o.createdAt.toISOString().split('T')[0] === dayStr,
        );
        data.push({
          label: current.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
          revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
          orders: dayOrders.length,
        });
        current.setDate(current.getDate() + 1);
      }
    } else {
      for (let m = 0; m < 12; m++) {
        const monthOrders = orders.filter((o) => o.createdAt.getMonth() === m);
        data.push({
          label: new Date(2024, m, 1).toLocaleDateString('en-NG', { month: 'short' }),
          revenue: monthOrders.reduce((s, o) => s + Number(o.total), 0),
          orders: monthOrders.length,
        });
      }
    }

    return data;
  }
}

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard') getDashboardStats() { return this.analyticsService.getDashboardStats(); }
  @Get('revenue') getRevenue(@Query('period') period: 'week' | 'month' | 'year') { return this.analyticsService.getRevenueChart(period); }
  @Get('top-products') getTopProducts(@Query('limit') limit?: number) { return this.analyticsService.getTopProducts(limit); }
  @Get('order-distribution') getOrderDistribution() { return this.analyticsService.getOrderStatusDistribution(); }
  @Get('recent-orders') getRecentOrders(@Query('limit') limit?: number) { return this.analyticsService.getRecentOrders(limit); }
  @Get('category-revenue') getCategoryRevenue() { return this.analyticsService.getCategoryRevenue(); }
}

@Module({ controllers: [AnalyticsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
