'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tag, Plus, Trash2, X, Check, Copy } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const couponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.coerce.number().min(0),
  maxDiscount: z.coerce.number().optional(),
  minOrderAmount: z.coerce.number().optional(),
  usageLimit: z.coerce.number().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isActive: z.boolean().default(true),
});

type CouponForm = z.infer<typeof couponSchema>;

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get('/coupons/admin') as Promise<any>,
  });

  const coupons: Coupon[] = data?.data || [];

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CouponForm>({
    resolver: zodResolver(couponSchema),
    defaultValues: { type: 'PERCENTAGE', isActive: true },
  });

  const couponType = watch('type');

  const createMutation = useMutation({
    mutationFn: (d: CouponForm) => api.post('/coupons/admin', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setShowForm(false); reset(); toast.success('Coupon created'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to create coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/admin/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); toast.success('Coupon deleted'); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/coupons/admin/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const copyCoupon = (code: string) => { navigator.clipboard.writeText(code); toast.success('Copied!'); };

  const typeLabels = { PERCENTAGE: '%', FIXED: '₦', FREE_SHIPPING: '🚚' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage discount codes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Coupon'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Create Coupon</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                <input {...register('code')} placeholder="SAVE10" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 font-mono uppercase" />
                {errors.code && <p className="text-red-500 text-xs mt-0.5">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                <select {...register('type')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white">
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed Amount</option>
                  <option value="FREE_SHIPPING">Free Shipping</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {couponType === 'PERCENTAGE' ? 'Discount %' : couponType === 'FIXED' ? 'Discount ₦' : 'Value (0 = free ship)'}
                </label>
                <input type="number" {...register('value')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                {errors.value && <p className="text-red-500 text-xs mt-0.5">{errors.value.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Usage Limit</label>
                <input type="number" {...register('usageLimit')} placeholder="Unlimited" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {couponType === 'PERCENTAGE' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Discount (₦)</label>
                  <input type="number" {...register('maxDiscount')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Order (₦)</label>
                <input type="number" {...register('minOrderAmount')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                <input type="datetime-local" {...register('startDate')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                {errors.startDate && <p className="text-red-500 text-xs mt-0.5">{errors.startDate.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date *</label>
                <input type="datetime-local" {...register('endDate')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                {errors.endDate && <p className="text-red-500 text-xs mt-0.5">{errors.endDate.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('isActive')} className="accent-yellow-500 w-4 h-4" id="isActive" />
              <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Active immediately</label>
            </div>

            <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors">
              {createMutation.isPending ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Create Coupon
            </button>
          </form>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Code</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Type</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Value</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Min Order</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Used / Limit</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Expires</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>)}
                  </tr>
                ))
                : coupons.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No coupons yet. Create your first discount code.
                      </td>
                    </tr>
                  )
                  : coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg text-xs">{coupon.code}</span>
                          <button onClick={() => copyCoupon(coupon.code)} className="text-gray-400 hover:text-gray-600">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{coupon.type.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">
                        {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : coupon.type === 'FIXED' ? `₦${coupon.value.toLocaleString()}` : 'Free Ship'}
                        {coupon.maxDiscount ? <span className="text-xs text-gray-400 block">max ₦{coupon.maxDiscount.toLocaleString()}</span> : null}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500">{coupon.minOrderAmount ? `₦${coupon.minOrderAmount.toLocaleString()}` : '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn('font-semibold', coupon.usageLimit && coupon.usageCount >= coupon.usageLimit ? 'text-red-600' : 'text-gray-700')}>
                          {coupon.usageCount} / {coupon.usageLimit || '∞'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500 text-xs">{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleMutation.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                          className={cn('text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors', coupon.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200')}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteMutation.mutate(coupon.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
