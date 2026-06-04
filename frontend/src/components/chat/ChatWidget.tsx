'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Minimize2, Maximize2,
  Shield, User, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useAuthStore } from '@/store/useAuthStore';

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [started, setStarted] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestFormSubmitted, setGuestFormSubmitted] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayName = isAuthenticated
    ? `${user?.firstName} ${user?.lastName}`
    : guestName || 'You';

  const { isConnected, room, messages, typingInfo, isAgentOnline, connect, startChat, sendMessage, sendTyping } = useLiveChat({
    guestName: isAuthenticated ? undefined : (guestName || 'Guest'),
    guestEmail: isAuthenticated ? undefined : guestEmail,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingInfo]);

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const staffMessages = messages.filter((m) => m.isStaff);
      if (staffMessages.length > 0) setUnread((prev) => prev + 1);
    } else {
      setUnread(0);
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnread(0);
    setIsMinimized(false);
    if (!isConnected) connect();
  };

  const handleStart = async () => {
    if (!isAuthenticated && !guestFormSubmitted) return;
    setIsLoading(true);
    try {
      await startChat();
      setStarted(true);
    } catch {
      // connection error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setGuestFormSubmitted(true);
  };

  useEffect(() => {
    if ((isAuthenticated || guestFormSubmitted) && isOpen && !started && !isLoading) {
      handleStart();
    }
  }, [isAuthenticated, guestFormSubmitted, isOpen]);

  const handleSend = () => {
    if (!input.trim() || !room) return;
    sendMessage(room.id, input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (room) sendTyping(room.id);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open live chat"
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all',
        isMinimized ? 'h-14' : 'h-[520px]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">BILY Support</p>
            <p className={cn('text-xs mt-0.5', isAgentOnline || room?.status === 'ACTIVE' ? 'text-green-400' : 'text-gray-400')}>
              {isAgentOnline || room?.status === 'ACTIVE' ? '● Agent online' : '● We\'ll reply soon'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Guest form */}
          {!isAuthenticated && !guestFormSubmitted && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-yellow-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-center mb-1">Start a conversation</h3>
              <p className="text-sm text-gray-500 text-center mb-5">We typically reply in a few minutes</p>
              <form onSubmit={handleGuestSubmit} className="w-full space-y-3">
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name *"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                />
                <input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  type="email"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors"
                >
                  Start Chat
                </button>
              </form>
            </div>
          )}

          {/* Loading */}
          {(isAuthenticated || guestFormSubmitted) && !started && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          )}

          {/* Chat area */}
          {started && room && (
            <>
              {room.status === 'CLOSED' && (
                <div className="mx-4 mt-3 p-3 bg-gray-50 rounded-xl text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600 font-medium">This chat has been closed.</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {/* Welcome message */}
                <div className="flex justify-center">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    Chat started · We'll reply soon
                  </span>
                </div>

                {messages.map((msg) => {
                  const isMe = !msg.isStaff;
                  return (
                    <div key={msg.id} className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-3.5 h-3.5 text-black" />
                        </div>
                      )}
                      <div className={cn('max-w-[75%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                        <div className={cn(
                          'px-3 py-2 rounded-2xl text-sm',
                          isMe
                            ? 'bg-yellow-500 text-black rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                        )}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                          {isMe ? 'You' : (msg.senderName || 'Agent')}
                        </span>
                      </div>
                      {isMe && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {typingInfo && (
                  <div className={cn('flex gap-2', typingInfo.isStaff ? 'justify-start' : 'justify-end')}>
                    {typingInfo.isStaff && (
                      <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                    <div className="bg-gray-100 rounded-2xl px-3 py-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {room.status !== 'CLOSED' && (
                <div className="p-3 border-t border-gray-100 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message…"
                      rows={1}
                      className="flex-1 px-3 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none max-h-24"
                      style={{ minHeight: '40px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="w-10 h-10 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black rounded-xl flex items-center justify-center transition-colors shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
