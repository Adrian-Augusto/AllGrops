import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  Header,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payment.service';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create Stripe Checkout Session
   * Returns checkout URL for payment
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create payment',
    description:
      'Creates a Stripe Checkout Session for group highlighting. Returns Stripe checkout link.',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created',
    schema: {
      example: {
        checkout_url: 'https://checkout.stripe.com/c/pay/...',
        session_id: 'cs_test_...',
        idempotency_key: 'key',
      },
    },
  })
  async createPayment(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPreference({
      userId: user.id,
      planId: dto.planId,
      groupId: dto.groupId,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /**
   * Stripe Webhook Handler
   * Receives payment status notifications
   * Does not require authentication
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook',
    description: 'Receives payment status notifications from Stripe',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed',
    schema: { example: { success: true } },
  })
  async handleWebhook(
    @Body() body: any,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    return this.paymentsService.handleWebhook(
      body,
      stripeSignature,
    );
  }

  /**
   * List available payment plans
   * Public endpoint
   */
  @Get('plans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List payment plans',
    description: 'Returns all available highlighting plans',
  })
  @ApiResponse({
    status: 200,
    description: 'List of plans',
    schema: {
      example: [
        {
          id: 'plan-id',
          name: 'Basic',
          price: 29.99,
          duration: 30,
          description: 'Basic plan',
        },
      ],
    },
  })
  async getPlans() {
    return this.paymentsService.getAvailablePlans();
  }
}

