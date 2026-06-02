'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SecurityPage() {
  const [show, setShow] = useState({ current: false, new: false, confirm: false });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: PasswordForm) => api.post('/auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to change password'),
  });

  const toggle = (field: keyof typeof show) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const InputField = ({ name, label, showKey }: { name: keyof PasswordForm; label: string; showKey: keyof typeof show }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          {...register(name)}
          type={show[showKey] ? 'text' : 'password'}
          className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
        />
        <button type="button" onClick={() => toggle(showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-bold text-gray-900">Password & Security</h2>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 max-w-md">
        <InputField name="currentPassword" label="Current Password" showKey="current" />
        <InputField name="newPassword" label="New Password" showKey="new" />
        <InputField name="confirmPassword" label="Confirm New Password" showKey="confirm" />

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
          Password must be at least 8 characters and include an uppercase letter and a number.
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors"
        >
          {mutation.isPending ? (
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          Change Password
        </button>
      </form>
    </div>
  );
}
