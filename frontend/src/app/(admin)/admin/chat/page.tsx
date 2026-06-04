'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, Shield, User, Clock, CheckCircle2,
  X, Loader2, ArrowLeft, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveChat, ChatRoom, ChatMessage } from '@/hooks/useLiveChat';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/lib/utils';
import Cookies from 'js-cookie';

const STATUS_STYLES: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

export default function AdminChatPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [input, setInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'WAITING' | 'ACTIVE' | ''>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, messages, typingInfo, connect, joinRoom, sendMessage, sendTyping, closeRoom, setMessages } = useLiveChat();

  useEffect(() => {
    connect();
  }, [connect]);

  // Fetch rooms via REST on mount and when new_room / room_updated events fire
  const fetchRooms = async () => {
    try {
      const token = Cookies.get('accessToken');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/chat/admin/rooms${statusFilter ? `?status=${statusFilter}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setRooms(json.data || []);
    } catch {
      // silently ignore fetch errors
    }
  };

  useEffect(() => { fetchRooms(); }, [statusFilter]);

  // Listen for socket-pushed room events to refresh the list
  useEffect(() => {
    const { connect: _c, ...rest } = { connect } as any;
    // We use a separate socket listener via the hook's internal socket —
    // instead, we poll rooms every 10s as a lightweight fallback
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingInfo]);

  const handleSelectRoom = async (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages([]);
    try {
      const joined = await joinRoom(room.id);
      setMessages(joined.messages || []);
    } catch {
      // join failed
    }
  };

  const handleSend = () => {
    if (!input.trim() || !selectedRoom) return;
    sendMessage(selectedRoom.id, input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClose = async () => {
    if (!selectedRoom) return;
    closeRoom(selectedRoom.id);
    setSelectedRoom((prev) => prev ? { ...prev, status: 'CLOSED' } : prev);
    setRooms((prev) => prev.map((r) => r.id === selectedRoom.id ? { ...r, status: 'CLOSED' } : r));
    await fetchRooms();
  };

  const getDisplayName = (room: ChatRoom) =>
    room.user
      ? `${room.user.firstName} ${room.user.lastName}`
      : room.guestName || 'Guest';

  const getEmail = (room: ChatRoom) =>
    room.user?.email || room.guestEmail || '';

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Live Chat</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time customer support
            <span className={cn('ml-2 inline-flex items-center gap-1 text-xs font-semibold', isConnected ? 'text-green-600' : 'text-red-500')}>
              <Circle className={cn('w-2 h-2 fill-current', isConnected ? 'text-green-500' : 'text-red-500')} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </p>
        </div>

        <div className="flex gap-1">
          {(['', 'WAITING', 'ACTIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize',
                statusFilter === s ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        {/* Room list */}
        <div className={cn(
          'bg-white rounded-2xl border border-gray-200 overflow-y-auto',
          selectedRoom ? 'hidden md:block md:w-72 md:shrink-0' : 'w-full md:w-72 md:shrink-0',
        )}>
          {rooms.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active chats</p>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={cn(
                  'w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  selectedRoom?.id === room.id && 'bg-yellow-50 border-l-2 border-l-yellow-500',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{getDisplayName(room)}</p>
                      {getEmail(room) && <p className="text-xs text-gray-400 truncate">{getEmail(room)}</p>}
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5', STATUS_STYLES[room.status])}>
                    {room.status}
                  </span>
                </div>
                {room.messages?.[0] && (
                  <p className="text-xs text-gray-500 truncate pl-10">{room.messages[0].content}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1 pl-10 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDate(room.updatedAt)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Conversation panel */}
        <div className={cn(
          'bg-white rounded-2xl border border-gray-200 flex flex-col min-h-0',
          selectedRoom ? 'flex-1' : 'hidden md:flex flex-1',
        )}>
          {!selectedRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose a chat room from the list to start replying</p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Back button — mobile only */}
                  <button
                    onClick={() => setSelectedRoom(null)}
                    className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                    aria-label="Back to chat list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{getDisplayName(selectedRoom)}</p>
                    <p className="text-xs text-gray-400 truncate">{getEmail(selectedRoom)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[selectedRoom.status])}>
                    {selectedRoom.status}
                  </span>
                  {selectedRoom.status !== 'CLOSED' && (
                    <button
                      onClick={handleClose}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
                {messages.length === 0 && (
                  <div className="flex justify-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      No messages yet — waiting for customer
                    </span>
                  </div>
                )}

                {messages.map((msg) => {
                  const isAdmin = msg.isStaff;
                  return (
                    <div key={msg.id} className={cn('flex gap-3', isAdmin ? 'justify-end' : 'justify-start')}>
                      {!isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div className={cn('max-w-[70%] flex flex-col', isAdmin ? 'items-end' : 'items-start')}>
                        <div className={cn(
                          'px-4 py-2.5 rounded-2xl text-sm',
                          isAdmin
                            ? 'bg-yellow-500 text-black rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                        )}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                          {msg.senderName || (isAdmin ? 'Agent' : 'Customer')}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-4 h-4 text-black" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {typingInfo && !typingInfo.isStaff && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-3 py-2.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {selectedRoom.status === 'CLOSED' && (
                  <div className="flex justify-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Chat closed
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {selectedRoom.status !== 'CLOSED' && (
                <div className="p-4 border-t border-gray-100 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => { setInput(e.target.value); if (selectedRoom) sendTyping(selectedRoom.id); }}
                      onKeyDown={handleKeyDown}
                      placeholder={`Reply as ${user?.firstName}… (Enter to send)`}
                      rows={2}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="w-11 h-11 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black rounded-xl flex items-center justify-center transition-colors shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
