import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Controller, Get, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { ChatRoomStatus } from '@prisma/client';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms/my')
  async getMyRoom(@CurrentUser('id') userId: string) {
    const room = await this.chatService.getOrCreateRoom(userId);
    return { data: room };
  }

  @Get('rooms/:id/messages')
  async getMessages(
    @Param('id') roomId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const messages = await this.chatService.getMessages(roomId, take || 50, skip || 0);
    return { data: messages };
  }

  @Get('admin/rooms') @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllRooms(@Query('status') status?: ChatRoomStatus) {
    const rooms = await this.chatService.getAllRooms(status);
    return { data: rooms };
  }

  @Get('admin/rooms/:id') @Roles('ADMIN', 'SUPER_ADMIN')
  async getRoomById(@Param('id') id: string) {
    const room = await this.chatService.getRoomById(id);
    return { data: room };
  }
}

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
