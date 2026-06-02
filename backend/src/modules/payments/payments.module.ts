import { Module } from '@nestjs/common';
import { PaymentsService, InitiatePaymentDto } from './payments.service';
import {
  Controller, Post, Get, Body, Param, Req, Headers, UseGuards, HttpCode, HttpStatus, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth()
  initiatePayment(@CurrentUser('id') userId: string, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(userId, dto);
  }

  @Get('verify/paystack/:reference')
  @ApiBearerAuth()
  verifyPaystack(@Param('reference') reference: string) {
    return this.paymentsService.verifyPaystack(reference);
  }

  @Get('verify/flutterwave/:transactionId')
  @ApiBearerAuth()
  verifyFlutterwave(@Param('transactionId') transactionId: string) {
    return this.paymentsService.verifyFlutterwave(transactionId);
  }

  @Public()
  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  paystackWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handlePaystackWebhook(payload, signature);
  }

  @Public()
  @Post('webhooks/flutterwave')
  @HttpCode(HttpStatus.OK)
  flutterwaveWebhook(
    @Body() payload: any,
    @Headers('verif-hash') signature: string,
  ) {
    return this.paymentsService.handleFlutterwaveWebhook(payload, signature);
  }
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
