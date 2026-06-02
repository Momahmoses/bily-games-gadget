import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus, TicketPriority } from '@prisma/client';
import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';

class CreateTicketDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}

class AddMessageDto {
  @ApiProperty() @IsString() message: string;
}

class UpdateTicketDto {
  @ApiPropertyOptional() status?: TicketStatus;
  @ApiPropertyOptional() priority?: TicketPriority;
}

@Injectable()
class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNo = `TKT-${Date.now().toString().slice(-8)}`;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNo,
        userId,
        subject: dto.subject,
        category: dto.category,
        messages: {
          create: { senderId: userId, message: dto.message, isStaff: false },
        },
      },
      include: { messages: true },
    });
    return { data: ticket, message: 'Support ticket created' };
  }

  async getUserTickets(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.supportTicket.count({ where: { userId } }),
    ]);
    return { data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getTicketById(ticketId: string, userId?: string) {
    const where: any = { id: ticketId };
    if (userId) where.userId = userId;
    const ticket = await this.prisma.supportTicket.findFirst({
      where,
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return { data: ticket };
  }

  async addMessage(ticketId: string, senderId: string, dto: AddMessageDto, isStaff = false) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.ticketMessage.create({
      data: { ticketId, senderId, message: dto.message, isStaff },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: isStaff ? TicketStatus.IN_PROGRESS : ticket.status },
    });

    return { data: message, message: 'Message sent' };
  }

  async getAllTickets(page = 1, limit = 20, status?: TicketStatus) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, skip, take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: dto,
    });
    return { data: ticket, message: 'Ticket updated' };
  }
}

@ApiTags('Support')
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  createTicket(@CurrentUser('id') userId: string, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets/my')
  getMyTickets(@CurrentUser('id') userId: string, @Query('page') page?: number) {
    return this.supportService.getUserTickets(userId, page);
  }

  @Get('tickets/my/:id')
  getMyTicket(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.supportService.getTicketById(id, userId);
  }

  @Post('tickets/:id/messages')
  addMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(id, userId, dto, false);
  }

  @Get('admin/tickets') @Roles('ADMIN', 'SUPER_ADMIN')
  getAllTickets(@Query('page') page?: number, @Query('status') status?: TicketStatus) {
    return this.supportService.getAllTickets(page, 20, status);
  }

  @Get('admin/tickets/:id') @Roles('ADMIN', 'SUPER_ADMIN')
  getTicketAdmin(@Param('id') id: string) {
    return this.supportService.getTicketById(id);
  }

  @Post('admin/tickets/:id/messages') @Roles('ADMIN', 'SUPER_ADMIN')
  adminReply(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(id, adminId, dto, true);
  }

  @Put('admin/tickets/:id') @Roles('ADMIN', 'SUPER_ADMIN') @HttpCode(HttpStatus.OK)
  updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.updateTicket(id, dto);
  }
}

@Module({ controllers: [SupportController], providers: [SupportService] })
export class SupportModule {}
