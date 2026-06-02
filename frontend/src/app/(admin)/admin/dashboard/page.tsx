'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingBag, Users, Package, TrendingUp, AlertTriangle, Eye, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminDashboard() {
  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/analytics/dashboard') as Promise<any>,
    refetchInterval: 60 * 1000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['admin-revenue', 'month'],
    queryFn: () => api.get('/analytics/revenue?period=month') as Promise<any>,
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['admin-top-products'],
    queryFn: () => api.get('/analytics/top-products?limit=5') as Promise<any>,
  });

  const { data: recentOrdersData } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => api.get('/analytics/recent-orders?limit=8') as Promise<any>,
  });

  const { data: orderDistData } = useQuery({
    queryKey: ['order-distribution'],
    queryFn: () => api.get('/analytics/order-distribution') as Promise<any>,
  });

  const stats = statsData?.data;
  const revenueChart = revenueData?.data || [];
  const topProducts = topProductsData?.data || [];
  const recentOrders = recentOrdersData?.data || [];
  const orderDist = orderDistData?.data || [];

  const COLORS = ['#F59E0B', '#10B981', '#6366F1', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'];

  const statCards = stats ? [
    { title: 'Total Revenue', value: formatPrice(stats.revenue.total), sub: `${formatPrice(stats.revenue.monthly)} this month`, icon: DollarSign, color: 'bg-yellow-50 text-yellow-600', trend: '+12%' },
    { title: 'Total Orders', value: stats.orders.total.toLocaleString(), sub: `${stats.orders.pending} pending`, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', trend: '+8%' },
    { title: 'Customers', value: stats.customers.total.toLocaleString(), sub: `+${stats.customers.newThisMonth} this month`, icon: Users, color: 'bg-green-50 text-green-600', trend: '+15%' },
    { title: 'Active Products', value: stats.products.active.toLocaleString(), sub: `${stats.products.total} total`, icon: Package, color: 'bg-purple-50 text-purple-600', trend: '' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="text-sm text-gray-500">{formatDate(new Date().toISOString(), { dateStyle: 'full' })}</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            {card.trend && (
              <div className="flex items-center gap-1 mt-3">
                <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-semibold">{card.trend}</span>
                <span className="text-xs text-gray-400">vs last month</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats?.orders.pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800 font-medium">
            You have {stats.orders.pending} pending orders awaiting processing.
          </p>
          <Link href="/admin/orders?status=PENDING" className="ml-auto text-xs font-semibold text-yellow-700 hover:text-yellow-800 whitespace-nowrap">
            View Orders →
          </Link>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Revenue This Month</h2>
            <TrendingUp className="w-5 h-5 text-yellow-500" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [formatPrice(v), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2.5} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-5">Order Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={orderDist} dataKey="_count" nameKey="status" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                {orderDist.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {orderDist.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 capitalize">{item.status.toLowerCase()}</span>
                </div>
                <span className="font-semibold text-gray-900">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Top Selling Products</h2>
            <Link href="/admin/products" className="text-xs text-yellow-600 hover:text-yellow-700 font-medium">View All →</Link>
          </div>
          <div className="space-y-3">
            {topProducts.map((product: any, i: number) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                <div className="relative w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border shrink-0">
                  <Image src={product.images?.[0]?.url || 'https://placehold.co/40x40'} alt="" fill className="object-contain p-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{product.totalSold}</p>
                  <p className="text-xs text-gray-400">sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-yellow-600 hover:text-yellow-700 font-medium">View All →</Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{order.user?.firstName} {order.user?.lastName} · {order._count?.items} items</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                </div>
                <Link href={`/admin/orders/${order.id}`} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
