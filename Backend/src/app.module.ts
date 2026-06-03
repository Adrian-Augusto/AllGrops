import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/user.module';
import { GroupsModule } from './modules/groups/group.module';
import { CategoriesModule } from './modules/categories/category.module';
import { PaymentsModule } from './modules/payments/payment.module';
import { SubscriptionsModule } from './modules/subscriptions/subscription.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlansModule } from './modules/plans/plans.module';
import { PostsModule } from './modules/posts/post.module';
import { MailModule } from './modules/mail/mail.module';
import { UploadModule } from './modules/upload/upload.module';
import { TermsModule } from './modules/terms/terms.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    CategoriesModule,
    PaymentsModule,
    SubscriptionsModule,
    AdminModule,
    PlansModule,
    PostsModule,
    MailModule,
    UploadModule,
    TermsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
