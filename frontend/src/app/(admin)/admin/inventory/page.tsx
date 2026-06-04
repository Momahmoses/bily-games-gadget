'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, AlertTriangle, Plus, Minus, ArrowUpDown, Search } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface InventoryItem {
  id: string;
  quantity: number;
  reservedQty: number;
  lowStockAlert: number;
  trackStock: boolean;
  product: {
    id: string;
    name: string;
    sku: string;
    images: { url: string }[];
    category: { name: string };
  };
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjustModal, setAdjustModal] = useState<{ item: InventoryItem; type: 'IN' | 'OUT' | 'ADJUSTMENT' } | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-inventory', page, filter, search],
    queryFn: () =>
      filter === 'low'
        ? (api.get('/inventory/low-stock') as Promise<any>)
        : (api.get(`/inventory?page=${page}&limit=20&search=${search}`) as Promise<any>),
  });

  const items: InventoryItem[] = data?.data || [];
  const meta = data?.meta;

  const adjustMutation = useMutation({
    mutationFn: ({ productId, type, quantity, note, currentQty }: { productId: string; type: string; quantity: number; note?: string; currentQty: number }) => {
      const signedQty = type === 'OUT' ? -quantity : type === 'ADJUSTMENT' ? quantity - currentQty : quantity;
      return api.post(`/inventory/products/${productId}/adjust`, { quantity: signedQty, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      setAdjustModal(null);
      setAdjustQty('');
      setAdjustNote('');
      toast.success('Stock adjusted');
    },
    onError: (e: any) => toast.error(e?.message || 'Adjustment failed'),
  });

  const handleAdjust = () => {
    if (!adjustModal || !adjustQty) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) { toast.error('Enter a valid quantity'); return; }
    adjustMutation.mutate({
      productId: adjustModal.item.product.id,
      type: adjustModal.type,
      quantity: qty,
      note: adjustNote || undefined,
      currentQty: adjustModal.item.quantity,
    });
  };

  const available = (item: InventoryItem) => item.quantity - item.reservedQty;
  const stockStatus = (item: InventoryItem) => {
    const avail = available(item);
    if (avail <= 0) return 'out';
    if (avail <= item.lowStockAlert) return 'low';
    return 'ok';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage stock levels across all products</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={cn('px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors', filter === f ? 'bg-yellow-500 text-black' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              {f === 'all' ? 'All' : f === 'low' ? '⚠ Low Stock' : '✕ Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Category</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">In Stock</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Reserved</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Available</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Alert</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>)}
                  </tr>
                ))
                : items.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No inventory items found
                      </td>
                    </tr>
                  )
                  : items.map((item) => {
                    const status = stockStatus(item);
                    const avail = available(item);
                    return (
                      <tr key={item.id} className={cn('hover:bg-gray-50', status === 'out' ? 'bg-red-50/30' : status === 'low' ? 'bg-yellow-50/30' : '')}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border bg-gray-50 shrink-0">
                              <Image src={item.product.images?.[0]?.url || 'https://placehold.co/40x40'} alt="" fill className="object-contain p-0.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 line-clamp-1">{item.product.name}</p>
                              <p className="text-xs font-mono text-gray-400">{item.product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{item.product.category?.name}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-900">{item.quantity}</td>
                        <td className="py-3 px-4 text-center text-gray-500">{item.reservedQty}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn('font-bold', avail <= 0 ? 'text-red-600' : avail <= item.lowStockAlert ? 'text-yellow-600' : 'text-green-600')}>
                            {avail}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500">{item.lowStockAlert}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', status === 'out' ? 'bg-red-100 text-red-700' : status === 'low' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                            {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => { setAdjustModal({ item, type: 'IN' }); setAdjustQty(''); setAdjustNote(''); }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Add stock"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setAdjustModal({ item, type: 'OUT' }); setAdjustQty(''); setAdjustNote(''); }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove stock"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setAdjustModal({ item, type: 'ADJUSTMENT' }); setAdjustQty(''); setAdjustNote(''); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Manual adjustment"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
            <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {meta.totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">
              {adjustModal.type === 'IN' ? 'Add Stock' : adjustModal.type === 'OUT' ? 'Remove Stock' : 'Manual Adjustment'}
            </h3>
            <p className="text-sm text-gray-500 mb-5 line-clamp-1">{adjustModal.item.product.name}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {adjustModal.type === 'ADJUSTMENT' ? 'Set stock to' : 'Quantity'}
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAdjust}
                disabled={adjustMutation.isPending || !adjustQty}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-2xl text-sm transition-colors"
              >
                {adjustMutation.isPending ? 'Saving...' : 'Confirm'}
              </button>
              <button onClick={() => setAdjustModal(null)} className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
