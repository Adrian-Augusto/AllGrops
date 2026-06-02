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
import rateLimit from 'express-rate-limit';

// Rate limiters
const createPaymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for non-POST requests
    return req.method !== 'POST';
  },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create payment preference in Mercado Pago
   * Returns only init_point URL for checkout
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create payment',
    description:
      'Creates a payment preference for group highlighting. Returns Mercado Pago checkout link.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment preference created',
    schema: {
      example: {
        init_point: 'https://www.mercadopago.com.br/checkout/v1/...',
        preference_id: 'payment-id',
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
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /**
   * Mercado Pago Webhook Handler
   * Receives payment status notifications
   * Does not require authentication
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mercado Pago webhook',
    description: 'Receives payment status notifications from Mercado Pago',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed',
    schema: { example: { success: true } },
  })
  async handleWebhook(
    @Body() body: PaymentWebhookDto,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    // For production, validate webhook signature
    // This example assumes MP validation will be added when secret is available
    return this.paymentsService.handleWebhook(
      body,
      xSignature,
      xRequestId,
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

