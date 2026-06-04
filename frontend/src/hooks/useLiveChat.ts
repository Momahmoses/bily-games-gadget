'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  isStaff: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  user?: { firstName: string; lastName: string; email: string } | null;
}

interface UseLiveChatOptions {
  guestName?: string;
  guestEmail?: string;
  autoConnect?: boolean;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

export function useLiveChat(options: UseLiveChatOptions = {}) {
  const { guestName, guestEmail, autoConnect = false } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingInfo, setTypingInfo] = useState<{ name: string; isStaff: boolean } | null>(null);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = Cookies.get('accessToken');

    socketRef.current = io(`${SOCKET_URL}/chat`, {
      auth: token ? { token } : undefined,
      query: guestName ? { guestName, guestEmail: guestEmail || '' } : undefined,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTypingInfo(null);
    });

    socket.on('typing', (data: { roomId: string; name: string; isStaff: boolean }) => {
      setTypingInfo({ name: data.name, isStaff: data.isStaff });
    });

    socket.on('stop_typing', () => setTypingInfo(null));

    socket.on('agent_joined', () => setIsAgentOnline(true));

    socket.on('room_closed', () => {
      setRoom((prev) => prev ? { ...prev, status: 'CLOSED' } : prev);
    });
  }, [guestName, guestEmail]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    setRoom(null);
    setMessages([]);
  }, []);

  const startChat = useCallback((): Promise<ChatRoom> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) { connect(); }

      const tryStart = () => {
        socketRef.current?.emit('start_chat', null, (response: { event: string; data: ChatRoom }) => {
          if (response?.data) {
            const chatRoom = response.data;
            setRoom(chatRoom);
            setMessages(chatRoom.messages || []);
            resolve(chatRoom);
          } else {
            reject(new Error('Failed to start chat'));
          }
        });
      };

      if (socketRef.current?.connected) {
        tryStart();
      } else {
        socketRef.current?.once('connect', tryStart);
      }
    });
  }, [connect]);

  const joinRoom = useCallback((roomId: string): Promise<ChatRoom> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('join_room', roomId, (response: { event: string; data: ChatRoom | string }) => {
        if (response?.event === 'room_joined' && typeof response.data !== 'string') {
          const chatRoom = response.data as ChatRoom;
          setRoom(chatRoom);
          setMessages(chatRoom.messages || []);
          resolve(chatRoom);
        } else {
          reject(new Error('Failed to join room'));
        }
      });
    });
  }, []);

  const sendMessage = useCallback((roomId: string, content: string) => {
    if (!content.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit('send_message', { roomId, content });
  }, []);

  const sendTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing', roomId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', roomId);
    }, 2000);
  }, []);

  const closeRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('close_room', roomId);
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [autoConnect, connect]);

  return {
    isConnected,
    room,
    messages,
    typingInfo,
    isAgentOnline,
    connect,
    disconnect,
    startChat,
    joinRoom,
    sendMessage,
    sendTyping,
    closeRoom,
    setMessages,
  };
}
