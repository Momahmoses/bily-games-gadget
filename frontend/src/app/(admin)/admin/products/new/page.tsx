'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Upload, Tag, Package, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Category, Brand } from '@/types';
import { cn } from '@/lib/utils';

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

export default function NewProductPage() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => api.get('/categories') as Promise<any>,
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands') as Promise<any>,
  });

  const categories: Category[] = categoriesData?.data || [];
  const brands: Brand[] = brandsData?.data || [];

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      inventory: { quantity: 0, lowStockAlert: 5, trackStock: true, allowBackorder: false },
      attributes: [],
      isFeatured: false,
      isDigital: false,
    },
  });

  const { fields: attrFields, append: addAttr, remove: removeAttr } = useFieldArray({ control, name: 'attributes' });

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
    setImages((prev) => [...prev, ...files].slice(0, 6));
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews].slice(0, 6));
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const createMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const payload = { ...data, tags, inventory: data.inventory };
      const res = await api.post('/products', payload) as any;
      const product = res.data;

      if (images.length > 0) {
        setUploading(true);
        const formData = new FormData();
        images.forEach((img) => formData.append('images', img));
        try {
          await api.post(`/products/${product.id}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          } as any);
        } finally {
          setUploading(false);
        }
      }
      return product;
    },
    onSuccess: (product) => {
      toast.success('Product created successfully!');
      router.push('/admin/products');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create product'),
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">New Product</h1>
          <p className="text-sm text-gray-500">Add a new product to your catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4 text-yellow-500" />Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
                <input {...register('name')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Description</label>
                <input {...register('shortDesc')} placeholder="Brief summary shown in listings..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Description *</label>
                <textarea {...register('description')} rows={5} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none" />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                <input {...register('tags')} placeholder="wireless, gaming, rgb, ..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
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
                  <input {...register('sku')} placeholder="BGG-001" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 font-mono" />
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
                <h2 className="font-bold text-gray-900">Specifications / Attributes</h2>
                <button type="button" onClick={() => addAttr({ name: '', value: '' })} className="flex items-center gap-1.5 text-sm font-semibold text-yellow-600 hover:text-yellow-700">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {attrFields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <input {...register(`attributes.${i}.name`)} placeholder="e.g. Color" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                  <input {...register(`attributes.${i}.value`)} placeholder="e.g. Black" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500" />
                  <button type="button" onClick={() => removeAttr(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {attrFields.length === 0 && <p className="text-sm text-gray-400 italic">No specifications added yet.</p>}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Category & Brand */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Organization</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <select {...register('categoryId')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white">
                  <option value="">Select category...</option>
                  {flatCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {'—'.repeat(c.depth)} {c.name}
                    </option>
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

            {/* Flags */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Options</h2>
              {[
                { name: 'isFeatured' as const, label: 'Featured Product', desc: 'Show on homepage' },
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
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4 text-yellow-500" />Product Images</h2>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors">
                <Upload className="w-6 h-6 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Click to upload</p>
                <p className="text-xs text-gray-400 mt-0.5">Up to 6 images</p>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-full h-20 object-cover rounded-xl border" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center">
                        <span className="text-xs">×</span>
                      </button>
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
            disabled={createMutation.isPending || uploading}
            className="flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-extrabold rounded-2xl transition-colors"
          >
            {(createMutation.isPending || uploading) ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Package className="w-5 h-5" />
            )}
            {uploading ? 'Uploading images...' : createMutation.isPending ? 'Creating...' : 'Create Product'}
          </button>
          <Link href="/admin/products" className="px-8 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
