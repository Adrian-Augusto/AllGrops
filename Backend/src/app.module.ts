import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/user.module';
import { CommunitiesModule } from './modules/communities/community.module';
import { CategoriesModule } from './modules/categories/category.module';
import { PaymentsModule } from './modules/payments/payment.module';
import { SubscriptionsModule } from './modules/subscriptions/subscription.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CommunitiesModule,
    CategoriesModule,
    PaymentsModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
