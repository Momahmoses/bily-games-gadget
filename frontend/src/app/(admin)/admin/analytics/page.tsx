'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Package, Users, Download, BarChart2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import Image from 'next/image';

type Period = 'week' | 'month' | 'year';

const PIE_COLORS = ['#EAB308', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#EAB308',
  PROCESSING: '#3B82F6',
  SHIPPED: '#F97316',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
  REFUNDED: '#8B5CF6',
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-yellow-50 rounded-xl">{icon}</div>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) => Object.values(row).join(',')).join('\n');
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get('/analytics/dashboard') as Promise<any>,
  });

  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['analytics-revenue', period],
    queryFn: () => api.get(`/analytics/revenue?period=${period}`) as Promise<any>,
  });

  const { data: topProductsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['analytics-top-products'],
    queryFn: () => api.get('/analytics/top-products?limit=10') as Promise<any>,
  });

  const { data: distributionData } = useQuery({
    queryKey: ['analytics-distribution'],
    queryFn: () => api.get('/analytics/order-distribution') as Promise<any>,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: () => api.get('/analytics/category-revenue') as Promise<any>,
  });

  const stats = statsData?.data;
  const revenueChart: any[] = revenueData?.data || [];
  const topProducts: any[] = topProductsData?.data || [];
  const distribution: any[] = (distributionData?.data || []).map((d: any) => ({
    name: d.status,
    value: d._count,
  }));
  const categoryRevenue: any[] = categoryData?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business performance at a glance</p>
        </div>
        <button
          onClick={() => exportCSV(revenueChart, `revenue-${period}`)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats
          ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)
          : (
            <>
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-yellow-600" />}
                label="Total Revenue"
                value={formatPrice(stats?.revenue?.total || 0)}
                sub={`${formatPrice(stats?.revenue?.monthly || 0)} this month`}
              />
              <StatCard
                icon={<ShoppingBag className="w-5 h-5 text-yellow-600" />}
                label="Total Orders"
                value={(stats?.orders?.total || 0).toLocaleString()}
                sub={`${stats?.orders?.pending || 0} pending`}
              />
              <StatCard
                icon={<Package className="w-5 h-5 text-yellow-600" />}
                label="Products"
                value={(stats?.products?.total || 0).toLocaleString()}
                sub={`${stats?.products?.active || 0} active`}
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-yellow-600" />}
                label="Customers"
                value={(stats?.customers?.total || 0).toLocaleString()}
                sub={`+${stats?.customers?.newThisMonth || 0} this month`}
              />
            </>
          )}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Revenue & Orders</h2>
          <div className="flex gap-1">
            {(['week', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize',
                  period === p ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {loadingRevenue
          ? <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
          : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChart} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }}
                  formatter={(value: any, name: string) =>
                    name === 'revenue' ? [formatPrice(value), 'Revenue'] : [value, 'Orders']
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#EAB308" strokeWidth={2} fill="url(#revenueGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} fill="url(#ordersGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* Bottom row — distribution + category */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Order status distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-5">Order Status Distribution</h2>
          {distribution.length === 0
            ? <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {distribution.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {distribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-600 capitalize">{d.name.toLowerCase().replace('_', ' ')}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Category revenue */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Revenue by Category</h2>
            <button
              onClick={() => exportCSV(categoryRevenue, 'category-revenue')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Export category data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          {categoryRevenue.length === 0
            ? <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryRevenue.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }}
                    formatter={(v: any) => [formatPrice(v), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#EAB308" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-yellow-500" />
            Top Selling Products
          </h2>
          <button
            onClick={() => exportCSV(topProducts.map((p) => ({ name: p.name, sold: p.totalSold, price: p.price, category: p.category?.name })), 'top-products')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Category</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Price</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Units Sold</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingProducts
                ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>)}
                  </tr>
                ))
                : topProducts.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">No sales data yet</td>
                    </tr>
                  )
                  : topProducts.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-400">#{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <Image src={product.images[0].url} alt={product.name} width={36} height={36} className="rounded-lg object-cover w-9 h-9" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <p className="font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500">{product.category?.name || '—'}</td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-800">{formatPrice(product.price)}</td>
                      <td className="py-3 px-4 text-center font-bold text-yellow-600">{(product.totalSold || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-800">{formatPrice((product.totalSold || 0) * Number(product.price))}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
