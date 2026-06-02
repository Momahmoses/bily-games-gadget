'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ChevronRight, Package } from 'lucide-react';
import api from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => api.get(`/orders/my-orders?page=${page}&limit=10`) as Promise<any>,
    enabled: isAuthenticated,
  });

  const orders: Order[] = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">Account</Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">My Orders</span>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-5 bg-gray-100 rounded w-32" />
                  <div className="h-5 bg-gray-100 rounded w-20" />
                </div>
                <div className="flex gap-3">
                  {[...Array(3)].map((_, j) => <div key={j} className="w-16 h-16 bg-gray-100 rounded-xl" />)}
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-5">Start shopping to see your orders here.</p>
            <Link href="/products" className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl text-sm hover:bg-yellow-400 transition-colors">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Order header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Order Number</p>
                      <p className="font-mono font-bold text-gray-900 text-sm">#{order.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium text-gray-700">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', getOrderStatusColor(order.status))}>
                      {order.status}
                    </span>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 flex items-center gap-0.5"
                    >
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Order items */}
                <div className="p-4">
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="shrink-0 flex items-center gap-2">
                        <div className="relative w-14 h-14 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                          <Image src={item.product?.images?.[0]?.url || 'https://placehold.co/56x56'} alt="" fill className="object-contain p-1" />
                        </div>
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gray-500">+{order.items.length - 4}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Previous</button>
                <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {meta.totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
