import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRoomStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateRoom(userId?: string, guestName?: string, guestEmail?: string) {
    if (userId) {
      const existing = await this.prisma.chatRoom.findFirst({
        where: { userId, status: { not: ChatRoomStatus.CLOSED } },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
      });
      if (existing) return existing;
    }

    return this.prisma.chatRoom.create({
      data: { userId, guestName, guestEmail, status: ChatRoomStatus.WAITING },
      include: { messages: true },
    });
  }

  async getRoomById(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!room) throw new NotFoundException('Chat room not found');
    return room;
  }

  async addMessage(roomId: string, content: string, senderId: string | null, senderName: string, isStaff: boolean) {
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { roomId, senderId, senderName, content, isStaff },
      }),
      this.prisma.chatRoom.update({
        where: { id: roomId },
        data: {
          status: isStaff ? ChatRoomStatus.ACTIVE : ChatRoomStatus.WAITING,
          updatedAt: new Date(),
        },
      }),
    ]);
    return message;
  }

  async getAllRooms(status?: ChatRoomStatus) {
    return this.prisma.chatRoom.findMany({
      where: status ? { status } : { status: { not: ChatRoomStatus.CLOSED } },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async closeRoom(roomId: string) {
    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { status: ChatRoomStatus.CLOSED },
    });
  }

  async getMessages(roomId: string, take = 50, skip = 0) {
    return this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take,
      skip,
    });
  }
}
