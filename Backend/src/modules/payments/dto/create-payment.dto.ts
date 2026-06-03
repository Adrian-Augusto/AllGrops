import { IsString, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'ID do plano premium (todos os seus grupos ficarão destacados)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'Chave de idempotência para prevenir duplicatas',
    example: 'user-123-1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class PaymentWebhookDto {
  @ApiProperty({
    description: 'ID do evento',
    example: '1234567890',
  })
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Tipo do evento',
    example: 'payment',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Dados do evento',
    required: false,
  })
  @IsOptional()
  data?: {
    id: string | number;
  };
}
