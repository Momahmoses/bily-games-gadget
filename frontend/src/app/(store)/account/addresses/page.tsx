'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { Address } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const addressSchema = z.object({
  label: z.string().optional(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().min(7, 'Required'),
  address: z.string().min(5, 'Required'),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  country: z.string().default('Nigeria'),
  postalCode: z.string().optional(),
  isDefault: z.boolean().default(false),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/users/addresses') as Promise<any>,
  });

  const addresses: Address[] = data?.data || [];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'Nigeria', isDefault: false },
  });

  const createMutation = useMutation({
    mutationFn: (d: AddressForm) => api.post('/users/addresses', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); closeForm(); toast.success('Address saved'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to save address'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressForm }) => api.put(`/users/addresses/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); closeForm(); toast.success('Address updated'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update address'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/addresses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address deleted'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
  });

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setShowForm(true);
    reset({ ...addr, isDefault: addr.isDefault });
  };

  const closeForm = () => { setShowForm(false); setEditId(null); reset({ country: 'Nigeria', isDefault: false }); };

  const onSubmit = (data: AddressForm) => {
    if (editId) updateMutation.mutate({ id: editId, data });
    else createMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900">My Addresses</h2>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Address
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{editId ? 'Edit Address' : 'New Address'}</h3>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'firstName' as const, label: 'First Name' },
                { name: 'lastName' as const, label: 'Last Name' },
              ].map(({ name, label }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input {...register(name)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white" />
                  {errors[name] && <p className="text-red-500 text-xs mt-0.5">{errors[name]?.message}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input {...register('phone')} placeholder="+234..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white" />
                {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
                <input {...register('label')} placeholder="Home, Office..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
              <input {...register('address')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white" />
              {errors.address && <p className="text-red-500 text-xs mt-0.5">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'city' as const, label: 'City' },
                { name: 'state' as const, label: 'State' },
                { name: 'postalCode' as const, label: 'Postal Code' },
              ].map(({ name, label }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input {...register(name)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white" />
                  {errors[name] && <p className="text-red-500 text-xs mt-0.5">{errors[name]?.message}</p>}
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isDefault')} className="accent-yellow-500 w-4 h-4" />
              <span className="text-sm text-gray-700 font-medium">Set as default address</span>
            </label>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors">
                {isPending ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? 'Update Address' : 'Save Address'}
              </button>
              <button type="button" onClick={closeForm} className="px-5 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-600 font-semibold rounded-xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No addresses saved yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className={cn('relative p-4 border-2 rounded-2xl', addr.isDefault ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200')}>
              {addr.isDefault && (
                <span className="absolute top-3 right-3 text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">Default</span>
              )}
              <div className="flex items-start justify-between pr-20 sm:pr-16">
                <div className="text-sm space-y-0.5">
                  {addr.label && <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">{addr.label}</p>}
                  <p className="font-semibold text-gray-900">{addr.firstName} {addr.lastName}</p>
                  <p className="text-gray-600">{addr.address}</p>
                  <p className="text-gray-600">{addr.city}, {addr.state}{addr.postalCode ? ` ${addr.postalCode}` : ''}</p>
                  <p className="text-gray-500">{addr.phone}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(addr)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => deleteMutation.mutate(addr.id)} disabled={deleteMutation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
