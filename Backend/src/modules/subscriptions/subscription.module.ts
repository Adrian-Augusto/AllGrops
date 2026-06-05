import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscription.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { SubscriptionsController } from './subscription.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionLimitsService, PrismaService],
  exports: [SubscriptionsService, SubscriptionLimitsService],
  imports: [MailModule],
})
export class SubscriptionsModule {}
