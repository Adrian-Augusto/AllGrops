import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscription.service';

@Module({
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
