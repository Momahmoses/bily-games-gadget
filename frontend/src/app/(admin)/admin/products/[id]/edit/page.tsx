'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save, Package, Upload, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Category, Brand, Product } from '@/types';
import Image from 'next/image';

const productSchema = z.object({
  name: z.string().min(3, 'Min 3 characters'),
  description: z.string().min(10, 'Min 10 characters'),
  shortDesc: z.string().optional(),
  categoryId: z.string().min(1, 'Category required'),
  brandId: z.string().optional(),
  basePrice: z.coerce.number().positive('Must be positive'),
  salePrice: z.coerce.number().optional(),
  sku: z.string().min(2, 'SKU required'),
  isFeatured: z.boolean().default(false),
  isDigital: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tags: z.string().optional(),
  inventory: z.object({
    quantity: z.coerce.number().min(0).default(0),
    lowStockAlert: z.coerce.number().min(0).default(5),
    trackStock: z.boolean().default(true),
    allowBackorder: z.boolean().default(false),
  }),
  attributes: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: productData, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => api.get(`/products/${id}`) as Promise<any>,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => api.get('/categories') as Promise<any>,
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands') as Promise<any>,
  });

  const product: Product | undefined = productData?.data;
  const categories: Category[] = categoriesData?.data || [];
  const brands: Brand[] = brandsData?.data || [];

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const { fields: attrFields, append: addAttr, remove: removeAttr } = useFieldArray({ control, name: 'attributes' });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        shortDesc: product.shortDesc || '',
        categoryId: product.categoryId,
        brandId: product.brandId || '',
        basePrice: Number(product.basePrice),
        salePrice: product.salePrice ? Number(product.salePrice) : undefined,
        sku: product.sku,
        isFeatured: product.isFeatured,
        isDigital: product.isDigital,
        isActive: product.isActive,
        tags: product.tags?.join(', ') || '',
        inventory: {
          quantity: product.inventory?.quantity || 0,
          lowStockAlert: product.inventory?.lowStockAlert || 5,
          trackStock: product.inventory?.trackStock ?? true,
          allowBackorder: product.inventory?.allowBackorder ?? false,
        },
        attributes: product.attributes || [],
      });
    }
  }, [product, reset]);

  const flattenCategories = (cats: Category[], depth = 0): { id: string; name: string; depth: number }[] => {
    const result: { id: string; name: string; depth: number }[] = [];
    cats.forEach((c) => {
      result.push({ id: c.id, name: c.name, depth });
      if (c.children?.length) result.push(...flattenCategories(c.children, depth + 1));
    });
    return result;
  };

  const flatCategories = flattenCategories(categories);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages((prev) => [...prev, ...files].slice(0, 6));
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewImagePreviews((prev) => [...prev, ...previews].slice(0, 6));
  };

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.delete(`/products/images/${imageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-product', id] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to delete image'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      await api.put(`/products/${id}`, { ...data, tags });

      if (newImages.length > 0) {
        setUploading(true);
        const formData = new FormData();
        newImages.forEach((img) => formData.append('images', img));
        try {
          await api.post(`/products/${id}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          } as any);
        } finally {
          setUploading(false);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product updated successfully');
      router.push('/admin/products');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update product'),
  });

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-white rounded-2xl border border-gray-200" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center py-20">
        <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500">Product not found.</p>
        <Link href="/admin/products" className="mt-3 inline-block text-yellow-600 font-semibold text-sm">← Back to products</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500 truncate max-w-md">{product.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Basic */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Basic Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
                <input {...register('name')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Description</label>
                <input {...register('shortDesc')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Description *</label>
                <textarea {...register('description')} rows={5} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none" />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                <input {...register('tags')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Pricing & SKU</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Price (₦) *</label>
                  <input type="number" {...register('basePrice')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                  {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sale Price (₦)</label>
                  <input type="number" {...register('salePrice')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU *</label>
                  <input {...register('sku')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 font-mono" />
                  {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Inventory</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity</label>
                  <input type="number" {...register('inventory.quantity')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Low Stock Alert</label>
                  <input type="number" {...register('inventory.lowStockAlert')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('inventory.trackStock')} className="accent-yellow-500 w-4 h-4" />
                  <span className="text-sm text-gray-700">Track Stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('inventory.allowBackorder')} className="accent-yellow-500 w-4 h-4" />
                  <span className="text-sm text-gray-700">Allow Backorder</span>
                </label>
              </div>
            </div>

            {/* Attributes */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Specifications</h2>
                <button type="button" onClick={() => addAttr({ name: '', value: '' })} className="flex items-center gap-1.5 text-sm font-semibold text-yellow-600 hover:text-yellow-700">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {attrFields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <input {...register(`attributes.${i}.name`)} placeholder="Name" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                  <input {...register(`attributes.${i}.value`)} placeholder="Value" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                  <button type="button" onClick={() => removeAttr(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {attrFields.length === 0 && <p className="text-sm text-gray-400 italic">No specifications added.</p>}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Organization */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Organization</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <select {...register('categoryId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white">
                  <option value="">Select category...</option>
                  {flatCategories.map((c) => (
                    <option key={c.id} value={c.id}>{'—'.repeat(c.depth)} {c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                <select {...register('brandId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white">
                  <option value="">No brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Options</h2>
              {[
                { name: 'isActive' as const, label: 'Active', desc: 'Visible in store' },
                { name: 'isFeatured' as const, label: 'Featured', desc: 'Show on homepage' },
                { name: 'isDigital' as const, label: 'Digital Product', desc: 'No physical shipping' },
              ].map(({ name, label, desc }) => (
                <label key={name} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" {...register(name)} className="accent-yellow-500 w-4 h-4 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Images */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4 text-yellow-500" />Images</h2>

              {/* Existing images */}
              {product.images && product.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((img) => (
                    <div key={img.id} className="relative group">
                      <Image src={img.url} alt="" width={80} height={80} className="w-full h-20 object-cover rounded-xl border" />
                      <button
                        type="button"
                        onClick={() => deleteImageMutation.mutate(img.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {img.isPrimary && <span className="absolute bottom-1 left-1 text-[9px] bg-yellow-500 text-black font-bold px-1 rounded">Primary</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors">
                <Upload className="w-5 h-5 text-gray-300 mb-1.5" />
                <p className="text-xs text-gray-500 font-medium">Add more images</p>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {newImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newImagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-full h-20 object-cover rounded-xl border border-yellow-300" />
                      <span className="absolute top-1 left-1 text-[9px] bg-blue-500 text-white font-bold px-1 rounded">New</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={updateMutation.isPending || uploading}
            className="flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-extrabold rounded-2xl transition-colors"
          >
            {(updateMutation.isPending || uploading) ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {uploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/products" className="px-8 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
