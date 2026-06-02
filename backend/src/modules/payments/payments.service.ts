import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';

export class InitiatePaymentDto {
  orderId: string;
  provider: 'paystack' | 'flutterwave';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { user: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order has already been paid');
    }

    const reference = `BGG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        provider: dto.provider === 'paystack' ? PaymentProvider.PAYSTACK : PaymentProvider.FLUTTERWAVE,
        reference,
        amount: order.total,
        currency: 'NGN',
        status: PaymentStatus.PENDING,
      },
    });

    let checkoutData: any;

    if (dto.provider === 'paystack') {
      checkoutData = await this.initiatePaystack(order, reference);
    } else {
      checkoutData = await this.initiateFlutterwave(order, reference);
    }

    return {
      data: {
        paymentId: payment.id,
        reference,
        ...checkoutData,
      },
      message: 'Payment initiated',
    };
  }

  async verifyPaystack(reference: string) {
    const secretKey = this.config.get('paystack.secretKey');

    try {
      const { data } = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );

      if (data.data.status === 'success') {
        await this.confirmPayment(reference, data.data.id.toString(), data.data);
        return { data: { verified: true }, message: 'Payment verified' };
      } else {
        throw new BadRequestException('Payment verification failed');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Paystack verification error', error);
      throw new BadRequestException('Unable to verify payment');
    }
  }

  async handlePaystackWebhook(payload: any, signature: string) {
    const webhookSecret = this.config.get('paystack.webhookSecret');
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      return;
    }

    if (payload.event === 'charge.success') {
      const { reference, id } = payload.data;
      await this.confirmPayment(reference, id.toString(), payload.data);
    }
  }

  async handleFlutterwaveWebhook(payload: any, signature: string) {
    const webhookSecret = this.config.get('flutterwave.webhookSecret');
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Flutterwave webhook signature');
      return;
    }

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const reference = payload.data.tx_ref;
      const transactionId = payload.data.id.toString();
      await this.confirmPayment(reference, transactionId, payload.data);
    }
  }

  async verifyFlutterwave(transactionId: string) {
    const secretKey = this.config.get('flutterwave.secretKey');

    try {
      const { data } = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );

      if (data.data.status === 'successful') {
        await this.confirmPayment(
          data.data.tx_ref,
          transactionId,
          data.data,
        );
        return { data: { verified: true }, message: 'Payment verified' };
      } else {
        throw new BadRequestException('Payment verification failed');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Unable to verify payment');
    }
  }

  private async confirmPayment(reference: string, transactionId: string, metadata: any) {
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment || payment.status === PaymentStatus.PAID) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { reference },
        data: {
          status: PaymentStatus.PAID,
          transactionId,
          paidAt: new Date(),
          webhookData: metadata,
          channel: metadata.channel || metadata.payment_type,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.PAID,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.PAID,
          comment: `Payment confirmed via ${payment.provider}. Transaction ID: ${transactionId}`,
        },
      });
    });

    this.eventEmitter.emit('payment.confirmed', { orderId: payment.orderId, reference });
  }

  private async initiatePaystack(order: any, reference: string) {
    const secretKey = this.config.get('paystack.secretKey');
    const frontendUrl = this.config.get('app.frontendUrl');

    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: order.user.email,
        amount: Math.round(Number(order.total) * 100),
        reference,
        callback_url: `${frontendUrl}/checkout/callback?provider=paystack&reference=${reference}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
        },
      },
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    return {
      provider: 'paystack',
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    };
  }

  private async initiateFlutterwave(order: any, reference: string) {
    const secretKey = this.config.get('flutterwave.secretKey');
    const frontendUrl = this.config.get('app.frontendUrl');

    const { data } = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: reference,
        amount: Number(order.total),
        currency: 'NGN',
        redirect_url: `${frontendUrl}/checkout/callback?provider=flutterwave`,
        customer: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`,
          phonenumber: order.user.phone,
        },
        customizations: {
          title: 'Bily Games and Gadget',
          description: `Payment for Order #${order.orderNumber}`,
          logo: 'https://bilygamesgadget.com/logo.png',
        },
        meta: { orderId: order.id, orderNumber: order.orderNumber },
      },
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    return {
      provider: 'flutterwave',
      paymentLink: data.data.link,
    };
  }
}
