import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/user.module';
import { CommunitiesModule } from './modules/communities/community.module';
import { CategoriesModule } from './modules/categories/category.module';
import { PaymentsModule } from './modules/payments/payment.module';
import { SubscriptionsModule } from './modules/subscriptions/subscription.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlansModule } from './modules/plans/plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CommunitiesModule,
    CategoriesModule,
    PaymentsModule,
    SubscriptionsModule,
    AdminModule,
    PlansModule,
  ],
})
export class AppModule {}
