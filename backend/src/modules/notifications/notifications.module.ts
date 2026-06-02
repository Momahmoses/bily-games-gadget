import { Module } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import {
  Controller, Get, Put, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private twilioClient: Twilio | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const sgApiKey = config.get('sendgrid.apiKey');
    if (sgApiKey) sgMail.setApiKey(sgApiKey);

    const twilioSid = config.get('twilio.accountSid');
    const twilioToken = config.get('twilio.authToken');
    if (twilioSid && twilioToken) {
      this.twilioClient = new Twilio(twilioSid, twilioToken);
    }
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { data: null, message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { data: null, message: 'All notifications marked as read' };
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, data },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    const fromEmail = this.config.get('sendgrid.fromEmail');
    const fromName = this.config.get('sendgrid.fromName');

    if (!fromEmail) {
      this.logger.warn('SendGrid not configured, skipping email');
      return;
    }

    try {
      await sgMail.send({
        to,
        from: { email: fromEmail, name: fromName },
        subject,
        html,
        text: text || subject,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
    }
  }

  async sendSMS(to: string, body: string) {
    const fromNumber = this.config.get('twilio.phoneNumber');
    if (!this.twilioClient || !fromNumber) {
      this.logger.warn('Twilio not configured, skipping SMS');
      return;
    }

    try {
      await this.twilioClient.messages.create({ body, from: fromNumber, to });
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
    }
  }

  @OnEvent('order.created')
  async handleOrderCreated({ order, userId }: any) {
    await this.createNotification(
      userId,
      NotificationType.ORDER_PLACED,
      'Order Placed Successfully!',
      `Your order #${order.orderNumber} has been placed and is awaiting payment.`,
      { orderId: order.id, orderNumber: order.orderNumber },
    );

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.sendEmail(
        user.email,
        `Order Confirmation - #${order.orderNumber}`,
        this.buildOrderConfirmationEmail(order, user),
      );
    }
  }

  @OnEvent('payment.confirmed')
  async handlePaymentConfirmed({ orderId }: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;

    await this.createNotification(
      order.userId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Received!',
      `Payment for order #${order.orderNumber} confirmed. We're processing your order.`,
      { orderId: order.id },
    );

    await this.sendEmail(
      order.user.email,
      `Payment Confirmed - Order #${order.orderNumber}`,
      this.buildPaymentConfirmedEmail(order, order.user),
    );
  }

  @OnEvent('order.statusChanged')
  async handleOrderStatusChanged({ order, newStatus }: any) {
    const messages: Record<string, string> = {
      PROCESSING: 'Your order is now being processed and prepared for shipment.',
      SHIPPED: `Your order is on its way! Tracking: ${order.trackingCode || 'N/A'}`,
      DELIVERED: 'Your order has been delivered. Enjoy your purchase!',
      CANCELLED: 'Your order has been cancelled.',
    };

    const typeMap: Record<string, NotificationType> = {
      PROCESSING: NotificationType.ORDER_PROCESSING,
      SHIPPED: NotificationType.ORDER_SHIPPED,
      DELIVERED: NotificationType.ORDER_DELIVERED,
      CANCELLED: NotificationType.ORDER_CANCELLED,
    };

    if (messages[newStatus]) {
      await this.createNotification(
        order.userId,
        typeMap[newStatus] || NotificationType.SYSTEM,
        `Order ${newStatus.charAt(0) + newStatus.slice(1).toLowerCase()}`,
        messages[newStatus],
        { orderId: order.id },
      );
    }
  }

  @OnEvent('inventory.lowStock')
  async handleLowStock({ productId, productName, quantity, threshold }: any) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    });

    for (const admin of admins) {
      await this.createNotification(
        admin.id,
        NotificationType.LOW_STOCK,
        '⚠️ Low Stock Alert',
        `Product "${productName}" has only ${quantity} units left (threshold: ${threshold}).`,
        { productId },
      );
    }
  }

  private buildOrderConfirmationEmail(order: any, user: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; padding: 20px; text-align: center;">
          <h1 style="color: #f59e0b; margin: 0;">BILY GAMES AND GADGET</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Order Confirmation</h2>
          <p>Hi ${user.firstName}, thank you for your order!</p>
          <p><strong>Order Number:</strong> #${order.orderNumber}</p>
          <p><strong>Total:</strong> ₦${Number(order.total).toLocaleString()}</p>
          <p>Please complete your payment to confirm the order.</p>
          <a href="${this.config.get('app.frontendUrl')}/orders/${order.id}"
             style="background: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 16px;">
            View Order
          </a>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Questions? Contact us at support@bilygamesgadget.com</p>
        </div>
      </div>
    `;
  }

  private buildPaymentConfirmedEmail(order: any, user: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; padding: 20px; text-align: center;">
          <h1 style="color: #f59e0b; margin: 0;">BILY GAMES AND GADGET</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #22c55e;">✅ Payment Confirmed!</h2>
          <p>Hi ${user.firstName}, your payment has been received.</p>
          <p><strong>Order Number:</strong> #${order.orderNumber}</p>
          <p><strong>Amount Paid:</strong> ₦${Number(order.total).toLocaleString()}</p>
          <p>We're now processing your order and will notify you when it ships.</p>
        </div>
      </div>
    `;
  }
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(userId, page, limit);
  }

  @Put(':id/read') @HttpCode(HttpStatus.OK)
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('read-all') @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
