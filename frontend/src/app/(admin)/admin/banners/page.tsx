'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image as ImageIcon, Plus, Trash2, X, Check, Edit2, GripVertical } from 'lucide-react';
import api from '@/lib/api';
import { Banner } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

const bannerSchema = z.object({
  title: z.string().min(1, 'Required'),
  subtitle: z.string().optional(),
  image: z.string().url('Must be a valid URL'),
  mobileImage: z.string().optional(),
  link: z.string().optional(),
  badge: z.string().optional(),
  isActive: z.boolean().default(true),
});

type BannerForm = z.infer<typeof bannerSchema>;

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => api.get('/banners') as Promise<any>,
  });

  const banners: Banner[] = data?.data || [];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BannerForm>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { isActive: true },
  });

  const openNew = () => { setEditBanner(null); reset({ isActive: true }); setShowForm(true); };
  const openEdit = (b: Banner) => {
    setEditBanner(b);
    reset({ title: b.title, subtitle: b.subtitle, image: b.image, mobileImage: b.mobileImage, link: b.link, badge: b.badge, isActive: b.isActive });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditBanner(null); reset(); };

  const createMutation = useMutation({
    mutationFn: (d: BannerForm) => api.post('/banners', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-banners'] }); closeForm(); toast.success('Banner created'); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BannerForm }) => api.put(`/banners/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-banners'] }); closeForm(); toast.success('Banner updated'); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/banners/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-banners'] }); toast.success('Banner deleted'); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/banners/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  const onSubmit = (data: BannerForm) => {
    if (editBanner) updateMutation.mutate({ id: editBanner.id, data });
    else createMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage homepage hero banners</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Banner
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">{editBanner ? 'Edit Banner' : 'Create Banner'}</h2>
            <button onClick={closeForm} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input {...register('title')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                {errors.title && <p className="text-red-500 text-xs mt-0.5">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                <input {...register('subtitle')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Image URL * (desktop)</label>
              <input {...register('image')} placeholder="https://..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              {errors.image && <p className="text-red-500 text-xs mt-0.5">{errors.image.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Image URL</label>
                <input {...register('mobileImage')} placeholder="https://..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Badge Text</label>
                <input {...register('badge')} placeholder="e.g. New Arrival" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link URL</label>
                <input {...register('link')} placeholder="/products?category=..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="accent-yellow-500 w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Show on homepage</span>
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors">
                {isPending ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editBanner ? 'Update Banner' : 'Create Banner'}
              </button>
              <button type="button" onClick={closeForm} className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Banner grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No banners yet. Create your first hero banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className={cn('bg-white rounded-2xl border-2 overflow-hidden', banner.isActive ? 'border-green-200' : 'border-gray-200 opacity-70')}>
              {/* Preview */}
              <div className="relative h-40 bg-gray-100">
                <Image src={banner.image} alt={banner.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  {banner.badge && <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full mb-1 inline-block">{banner.badge}</span>}
                  <p className="text-white font-extrabold text-lg leading-tight">{banner.title}</p>
                  {banner.subtitle && <p className="text-white/80 text-xs mt-0.5">{banner.subtitle}</p>}
                </div>
                <div className="absolute top-2 right-2">
                  <span className={cn('text-xs font-bold px-2 py-1 rounded-full', banner.isActive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white')}>
                    {banner.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs text-gray-500 truncate max-w-[200px]">{banner.link || 'No link'}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                    className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors', banner.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100')}
                  >
                    {banner.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => openEdit(banner)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(banner.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
