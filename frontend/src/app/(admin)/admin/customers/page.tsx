'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, ToggleLeft, ToggleRight, ChevronDown, Mail, Phone } from 'lucide-react';
import api from '@/lib/api';
import { User } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search, roleFilter],
    queryFn: () => api.get(`/users?page=${page}&limit=20&search=${search}&role=${roleFilter}`) as Promise<any>,
  });

  const customers: User[] = data?.data || [];
  const meta = data?.meta;

  const toggleMutation = useMutation({
    mutationFn: (userId: string) => api.put(`/users/${userId}/toggle-status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    CUSTOMER: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all registered users</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-xl">
          <Users className="w-4 h-4" />
          {meta?.total || 0} users
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white"
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Contact</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Role</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Orders</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Joined</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>)}
                  </tr>
                ))
                : customers.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No customers found
                      </td>
                    </tr>
                  )
                  : customers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 text-sm font-bold text-black">
                            {user.avatar ? (
                              <Image src={user.avatar} alt="" width={36} height={36} className="rounded-full" />
                            ) : (
                              `${user.firstName?.charAt(0)}${user.lastName?.charAt(0)}`
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-400">{user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="text-gray-700 flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" />{user.email}</p>
                          {user.phone && <p className="text-gray-500 text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{user.phone}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', roleColors[user.role] || 'bg-gray-100 text-gray-600')}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-700">{user._count?.orders ?? 0}</td>
                      <td className="py-3 px-4 text-center text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', (user as any).isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {(user as any).isActive !== false ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleMutation.mutate(user.id)}
                          disabled={toggleMutation.isPending || user.role === 'SUPER_ADMIN'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                          title={(user as any).isActive !== false ? 'Suspend user' : 'Activate user'}
                        >
                          {(user as any).isActive !== false
                            ? <ToggleRight className="w-5 h-5 text-green-500" />
                            : <ToggleLeft className="w-5 h-5 text-gray-400" />
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
