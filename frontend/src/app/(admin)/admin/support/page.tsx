'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Search, ChevronRight, X, Send, Clock, AlertTriangle, CheckCircle,
  User, Shield, ArrowLeft,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TicketMessage {
  id: string;
  message: string;
  isStaff: boolean;
  senderId: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  category?: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string; lastName: string; email: string };
  messages: TicketMessage[];
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const PRIORITY_ICONS: Record<TicketPriority, React.ReactNode> = {
  LOW: <Clock className="w-3 h-3" />,
  MEDIUM: <Clock className="w-3 h-3" />,
  HIGH: <AlertTriangle className="w-3 h-3" />,
  URGENT: <AlertTriangle className="w-3 h-3" />,
};

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', page, statusFilter],
    queryFn: () =>
      api.get(`/support/admin/tickets?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`) as Promise<any>,
  });

  const { data: ticketDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-ticket', selectedTicket?.id],
    queryFn: () => api.get(`/support/admin/tickets/${selectedTicket!.id}`) as Promise<any>,
    enabled: !!selectedTicket,
  });

  const tickets: Ticket[] = data?.data || [];
  const meta = data?.meta;
  const fullTicket: Ticket = ticketDetail?.data || selectedTicket;

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/support/admin/tickets/${id}/messages`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setReply('');
      toast.success('Reply sent');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send reply'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/support/admin/tickets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('Ticket updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const filteredTickets = tickets.filter(
    (t) =>
      !search ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNo.toLowerCase().includes(search.toLowerCase()) ||
      t.user.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSendReply = () => {
    if (!reply.trim() || !selectedTicket) return;
    replyMutation.mutate({ id: selectedTicket.id, message: reply.trim() });
  };

  if (selectedTicket) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to tickets
        </button>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Conversation */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-0.5">{fullTicket?.ticketNo}</p>
                  <h2 className="font-bold text-gray-900">{fullTicket?.subject}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fullTicket?.user?.firstName} {fullTicket?.user?.lastName} &bull; {fullTicket?.user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[fullTicket?.status])}>
                    {fullTicket?.status?.replace('_', ' ')}
                  </span>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1', PRIORITY_STYLES[fullTicket?.priority])}>
                    {PRIORITY_ICONS[fullTicket?.priority]}
                    {fullTicket?.priority}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[55vh]">
              {loadingDetail
                ? [...Array(3)].map((_, i) => (
                  <div key={i} className={cn('flex gap-3', i % 2 === 1 ? 'justify-end' : '')}>
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                    <div className="h-16 w-64 bg-gray-100 rounded-2xl animate-pulse" />
                  </div>
                ))
                : fullTicket?.messages?.map((msg) => (
                  <div key={msg.id} className={cn('flex gap-3', msg.isStaff ? 'justify-end' : 'justify-start')}>
                    {!msg.isStaff && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className={cn('max-w-[75%] rounded-2xl px-4 py-3 text-sm', msg.isStaff ? 'bg-yellow-500 text-black rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm')}>
                      <p>{msg.message}</p>
                      <p className={cn('text-xs mt-1.5', msg.isStaff ? 'text-black/50 text-right' : 'text-gray-400')}>
                        {formatDate(msg.createdAt, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    {msg.isStaff && (
                      <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {fullTicket?.status !== 'CLOSED' && fullTicket?.status !== 'RESOLVED' && (
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSendReply(); }}
                    placeholder="Type your reply… (Ctrl+Enter to send)"
                    rows={3}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!reply.trim() || replyMutation.isPending}
                    className="px-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black rounded-xl transition-colors"
                  >
                    {replyMutation.isPending
                      ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin block" />
                      : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — ticket actions */}
          <div className="lg:w-64 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Update Status</h3>
              <div className="space-y-1.5">
                {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as TicketStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateMutation.mutate({ id: selectedTicket.id, data: { status: s } })}
                    className={cn(
                      'w-full text-left text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-2',
                      fullTicket?.status === s ? STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-yellow-400' : 'hover:bg-gray-50 text-gray-600',
                    )}
                  >
                    {s === 'RESOLVED' || s === 'CLOSED' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Priority</h3>
              <div className="space-y-1.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateMutation.mutate({ id: selectedTicket.id, data: { priority: p } })}
                    className={cn(
                      'w-full text-left text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-2',
                      fullTicket?.priority === p ? PRIORITY_STYLES[p] + ' ring-2 ring-offset-1 ring-yellow-400' : 'hover:bg-gray-50 text-gray-600',
                    )}
                  >
                    {PRIORITY_ICONS[p]}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1.5">
              <div className="flex justify-between"><span>Opened</span><span className="font-medium text-gray-700">{fullTicket?.createdAt ? formatDate(fullTicket.createdAt) : '—'}</span></div>
              <div className="flex justify-between"><span>Updated</span><span className="font-medium text-gray-700">{fullTicket?.updatedAt ? formatDate(fullTicket.updatedAt) : '—'}</span></div>
              {fullTicket?.category && <div className="flex justify-between"><span>Category</span><span className="font-medium text-gray-700">{fullTicket.category}</span></div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and respond to customer support requests</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-xl">
          <MessageSquare className="w-4 h-4" />
          {meta?.total || 0} tickets
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, ticket no or email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TicketStatus | ''); setPage(1); }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Ticket</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Priority</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Messages</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Updated</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>
                    ))}
                  </tr>
                ))
                : filteredTickets.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No tickets found
                      </td>
                    </tr>
                  )
                  : filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                      <td className="py-3 px-4">
                        <p className="font-mono text-xs text-gray-400">{ticket.ticketNo}</p>
                        <p className="font-semibold text-gray-900 mt-0.5 line-clamp-1">{ticket.subject}</p>
                        {ticket.category && <p className="text-xs text-gray-400">{ticket.category}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{ticket.user.firstName} {ticket.user.lastName}</p>
                        <p className="text-xs text-gray-400">{ticket.user.email}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[ticket.status])}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit mx-auto', PRIORITY_STYLES[ticket.priority])}>
                          {PRIORITY_ICONS[ticket.priority]}
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 font-semibold">
                        {ticket.messages?.length ?? 0}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-400 text-xs">{formatDate(ticket.updatedAt)}</td>
                      <td className="py-3 px-4 text-center">
                        <button className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
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
