import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payment.service';

class CreatePaymentDto {
  userId: string;
  communityId: string;
  planId: string;
  planName: string;
  price: number;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPreference(dto);
  }

  @Post('webhook')
  webhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }
}
