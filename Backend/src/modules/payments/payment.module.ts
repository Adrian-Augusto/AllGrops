import { Module } from '@nestjs/common';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { MercadoPagoService } from './mercado-pago.service';
import { SubscriptionsModule } from '../subscriptions/subscription.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentRepository, MercadoPagoService, PrismaService],
  exports: [PaymentsService, PaymentRepository],
})
export class PaymentsModule {}

