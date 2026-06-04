import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

const ADMIN_ROOM = 'admin_room';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    const guestName = socket.handshake.query?.guestName as string | undefined;
    const guestEmail = socket.handshake.query?.guestEmail as string | undefined;

    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('jwt.secret'),
        });
        socket.data.userId = payload.sub;
        socket.data.userRole = payload.role;
        socket.data.userName = `${payload.firstName} ${payload.lastName}`;
        socket.data.isAuthenticated = true;

        if (['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          socket.join(ADMIN_ROOM);
          this.logger.log(`Admin connected: ${socket.data.userName}`);
        }
      } catch {
        socket.data.isAuthenticated = false;
      }
    } else {
      socket.data.isAuthenticated = false;
      socket.data.guestName = guestName || 'Guest';
      socket.data.guestEmail = guestEmail;
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('start_chat')
  async handleStartChat(@ConnectedSocket() socket: Socket) {
    const room = await this.chatService.getOrCreateRoom(
      socket.data.userId,
      socket.data.guestName,
      socket.data.guestEmail,
    );

    socket.join(room.id);
    socket.data.roomId = room.id;

    this.server.to(ADMIN_ROOM).emit('new_room', room);

    return { event: 'room_joined', data: room };
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string) {
    try {
      const room = await this.chatService.getRoomById(roomId);
      socket.join(roomId);
      socket.data.roomId = roomId;

      if (['ADMIN', 'SUPER_ADMIN'].includes(socket.data.userRole)) {
        this.server.to(roomId).emit('agent_joined', {
          name: socket.data.userName,
          roomId,
        });
      }

      return { event: 'room_joined', data: room };
    } catch {
      return { event: 'error', data: 'Room not found' };
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId: string; content: string },
  ) {
    const { roomId, content } = payload;
    if (!content?.trim()) return;

    const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(socket.data.userRole);
    const senderName = socket.data.userName || socket.data.guestName || 'Customer';

    const message = await this.chatService.addMessage(
      roomId,
      content.trim(),
      socket.data.userId || null,
      senderName,
      isStaff,
    );

    this.server.to(roomId).emit('message', message);

    const updatedRoom = await this.chatService.getRoomById(roomId);
    this.server.to(ADMIN_ROOM).emit('room_updated', {
      roomId,
      lastMessage: message,
      status: updatedRoom.status,
    });

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string) {
    const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(socket.data.userRole);
    socket.to(roomId).emit('typing', {
      roomId,
      name: socket.data.userName || socket.data.guestName || 'Customer',
      isStaff,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string) {
    socket.to(roomId).emit('stop_typing', { roomId });
  }

  @SubscribeMessage('close_room')
  async handleCloseRoom(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string) {
    await this.chatService.closeRoom(roomId);
    this.server.to(roomId).emit('room_closed', { roomId });
    this.server.to(ADMIN_ROOM).emit('room_closed', { roomId });
    return { event: 'room_closed', data: roomId };
  }
}
