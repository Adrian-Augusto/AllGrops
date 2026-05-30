import { Body, Controller, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payment.service';

class CreatePaymentDto {
  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ example: 'community-789' })
  communityId: string;

  @ApiProperty({ example: 'plan-111' })
  planId: string;

  @ApiProperty({ example: 'Premium' })
  planName: string;

  @ApiProperty({ example: 49.99 })
  price: number;
}

@ApiTags('payments')
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
