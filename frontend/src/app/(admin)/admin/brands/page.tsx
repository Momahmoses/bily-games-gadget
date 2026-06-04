'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Award, Plus, X, Check, Pencil, Trash2, ToggleLeft, ToggleRight, Globe, Package,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  isActive: boolean;
  _count?: { products: number };
}

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  logo: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type BrandForm = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => api.get('/brands/all') as Promise<any>,
  });

  const brands: Brand[] = data?.data || [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: { isActive: true },
  });

  const logoPreview = watch('logo');

  const openCreate = () => {
    setEditingBrand(null);
    reset({ name: '', logo: '', description: '', website: '', isActive: true });
    setShowForm(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    reset({
      name: brand.name,
      logo: brand.logo || '',
      description: brand.description || '',
      website: brand.website || '',
      isActive: brand.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingBrand(null); reset(); };

  const createMutation = useMutation({
    mutationFn: (d: BrandForm) => api.post('/brands', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-brands'] }); closeForm(); toast.success('Brand created'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to create brand'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BrandForm> }) => api.put(`/brands/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-brands'] }); closeForm(); toast.success('Brand updated'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update brand'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-brands'] }); toast.success('Brand deleted'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete brand'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/brands/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-brands'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const onSubmit = (d: BrandForm) => {
    const payload = {
      ...d,
      logo: d.logo || undefined,
      description: d.description || undefined,
      website: d.website || undefined,
    };
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage product brands and logos</p>
        </div>
        <button
          onClick={showForm ? closeForm : openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Brand'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">{editingBrand ? `Edit — ${editingBrand.name}` : 'Add New Brand'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name *</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Samsung"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('website')}
                    placeholder="https://samsung.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>
                {errors.website && <p className="text-red-500 text-xs mt-0.5">{errors.website.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    {...register('logo')}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                  />
                  {errors.logo && <p className="text-red-500 text-xs mt-0.5">{errors.logo.message}</p>}
                </div>
                {logoPreview && (
                  <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
                    <Image
                      src={logoPreview}
                      alt="logo preview"
                      width={48}
                      height={48}
                      className="object-contain w-full h-full p-1"
                      onError={() => setValue('logo', '')}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Short brand description..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('isActive')} id="brandActive" className="accent-yellow-500 w-4 h-4" />
              <label htmlFor="brandActive" className="text-sm text-gray-700 font-medium">Active (visible in store)</label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors"
              >
                {isPending
                  ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <Check className="w-4 h-4" />}
                {editingBrand ? 'Save Changes' : 'Create Brand'}
              </button>
              <button type="button" onClick={closeForm} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Brands grid */}
      {isLoading
        ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        )
        : brands.length === 0
          ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No brands yet</p>
              <p className="text-sm mt-1">Add your first brand to get started</p>
            </div>
          )
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {brands.map((brand) => (
                <div key={brand.id} className={cn('bg-white rounded-2xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-md', brand.isActive ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70')}>
                  {/* Logo + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {brand.logo
                        ? <Image src={brand.logo} alt={brand.name} width={48} height={48} className="object-contain w-full h-full p-1" />
                        : <Award className="w-5 h-5 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{brand.name}</p>
                      <p className="text-xs text-gray-400 truncate">/{brand.slug}</p>
                    </div>
                  </div>

                  {brand.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{brand.description}</p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{brand._count?.products ?? 0} products</span>
                    {brand.website && (
                      <a href={brand.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-yellow-600 transition-colors truncate">
                        <Globe className="w-3 h-3 shrink-0" /> Website
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => toggleMutation.mutate({ id: brand.id, isActive: !brand.isActive })}
                      disabled={toggleMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      title={brand.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {brand.isActive
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', brand.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => openEdit(brand)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit brand"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${brand.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(brand.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete brand"
                      >
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
