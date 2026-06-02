'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Settings, Save, DollarSign, Truck, Store, Globe } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Setting {
  key: string;
  value: string;
  description?: string;
}

const SETTING_GROUPS = [
  {
    title: 'Store Information',
    icon: Store,
    keys: [
      { key: 'store_name', label: 'Store Name', type: 'text' },
      { key: 'store_email', label: 'Support Email', type: 'email' },
      { key: 'store_phone', label: 'Store Phone', type: 'tel' },
      { key: 'store_address', label: 'Store Address', type: 'text' },
    ],
  },
  {
    title: 'Currency & Pricing',
    icon: DollarSign,
    keys: [
      { key: 'currency', label: 'Currency Code', type: 'text' },
      { key: 'currency_symbol', label: 'Currency Symbol', type: 'text' },
    ],
  },
  {
    title: 'Shipping',
    icon: Truck,
    keys: [
      { key: 'shipping_fee', label: 'Default Shipping Fee (₦)', type: 'number' },
      { key: 'free_shipping_threshold', label: 'Free Shipping Above (₦)', type: 'number' },
    ],
  },
  {
    title: 'SEO & Meta',
    icon: Globe,
    keys: [
      { key: 'meta_title', label: 'Site Title', type: 'text' },
      { key: 'meta_description', label: 'Meta Description', type: 'textarea' },
    ],
  },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/settings') as Promise<any>,
  });

  const settings: Setting[] = data?.data || [];

  const { register, handleSubmit, reset } = useForm<Record<string, string>>();

  useEffect(() => {
    if (settings.length) {
      const values = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
      reset(values);
    }
  }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      Promise.all(
        Object.entries(values).map(([key, value]) =>
          api.put(`/settings/${key}`, { value })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save settings'),
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Store Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure your store preferences</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-5">
          {SETTING_GROUPS.map(({ title, icon: Icon, keys }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-yellow-500" /> {title}
              </h2>
              <div className="space-y-3">
                {keys.map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    {type === 'textarea' ? (
                      <textarea
                        {...register(key)}
                        rows={3}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none"
                      />
                    ) : (
                      <input
                        type={type}
                        {...register(key)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-extrabold rounded-2xl transition-colors"
          >
            {saveMutation.isPending ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save All Settings
          </button>
        </form>
      )}
    </div>
  );
}
