'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Package, MapPin, CreditCard, Check, X, Clock, Truck } from 'lucide-react';
import api from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate, getOrderStatusColor, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const timelineIcons: Record<string, React.ElementType> = {
  PENDING: Clock,
  PAID: CreditCard,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: Check,
  CANCELLED: X,
  REFUNDED: CreditCard,
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/my-orders/${id}`) as Promise<any>,
  });

  const order: Order | undefined = data?.data;

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/orders/my-orders/${id}/cancel`, {}),
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to cancel order'),
  });

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl animate-pulse space-y-5">
          <div className="h-6 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-white rounded-2xl border border-gray-200" />
          <div className="h-64 bg-white rounded-2xl border border-gray-200" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl text-center py-20">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Order not found.</p>
          <Link href="/account/orders" className="mt-4 inline-block text-yellow-600 font-semibold text-sm">
            ← Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = order.status === 'PENDING';

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link href="/account/orders" className="text-gray-500 hover:text-gray-700">My Orders</Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900">#{order.orderNumber}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Order #{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-semibold px-4 py-1.5 rounded-full', getOrderStatusColor(order.status))}>
              {order.status}
            </span>
            {canCancel && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-1.5 border border-red-200 text-red-600 text-sm font-semibold rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Items ({order.items.length})</h2>
              <div className="space-y-4 divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pt-4 first:pt-0">
                    <div className="relative w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border shrink-0">
                      <Image src={item.product?.images?.[0]?.url || 'https://placehold.co/64x64'} alt={item.name} fill className="object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">{item.name}</p>
                      {item.options && Object.keys(item.options).length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 text-sm">{formatPrice(item.total)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatPrice(item.price)} × {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-5">Order Timeline</h2>
                <div className="space-y-4">
                  {[...order.timeline].reverse().map((event, i, arr) => {
                    const Icon = timelineIcons[event.status] || Clock;
                    const isFirst = i === 0;
                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', isFirst ? 'bg-yellow-500' : 'bg-gray-100')}>
                            <Icon className={cn('w-4 h-4', isFirst ? 'text-black' : 'text-gray-400')} />
                          </div>
                          {i < arr.length - 1 && <div className="w-0.5 h-full bg-gray-100 my-1" />}
                        </div>
                        <div className="pb-4">
                          <p className={cn('font-semibold text-sm', isFirst ? 'text-gray-900' : 'text-gray-500')}>{event.status.charAt(0) + event.status.slice(1).toLowerCase()}</p>
                          {event.comment && <p className="text-xs text-gray-500 mt-0.5">{event.comment}</p>}
                          <p className="text-xs text-gray-400 mt-1">{formatDate(event.createdAt, { dateStyle: 'medium', timeStyle: 'short' } as any)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking code */}
            {order.trackingCode && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Tracking Code</p>
                  <p className="font-mono text-blue-700 font-bold">{order.trackingCode}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Totals */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Order Total</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={Number(order.shippingFee) === 0 ? 'text-green-600' : ''}>{Number(order.shippingFee) === 0 ? 'FREE' : formatPrice(order.shippingFee)}</span>
                </div>
                {Number(order.tax) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-yellow-500" /> Delivery Address
              </h2>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p className="font-semibold text-gray-900">{order.address.firstName} {order.address.lastName}</p>
                <p>{order.address.address}</p>
                <p>{order.address.city}, {order.address.state}</p>
                <p>{order.address.country}</p>
                <p className="mt-1 text-gray-500">{order.address.phone}</p>
              </div>
            </div>

            {/* Payment info */}
            {order.payments && order.payments.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-yellow-500" /> Payment
                </h2>
                {order.payments.map((p) => (
                  <div key={p.id} className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provider</span>
                      <span className="font-semibold text-gray-900">{p.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reference</span>
                      <span className="font-mono text-xs text-gray-700 truncate max-w-[130px]">{p.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={cn('font-semibold', p.status === 'PAID' ? 'text-green-600' : p.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600')}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
