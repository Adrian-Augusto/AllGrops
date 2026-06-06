import { Module } from '@nestjs/common';
import { GroupsController } from './group.controller';
import { AdminGroupsController } from './admin-group.controller';
import { GroupsService } from './group.service';
import { CategoryService } from './services/category.service';
import { FeaturedGroupsService } from './featured-groups.service';
import { AdminGuard } from '../admin/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { SubscriptionsModule } from '../subscriptions/subscription.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [AuthModule, MailModule, SubscriptionsModule, UploadModule],
  controllers: [GroupsController, AdminGroupsController],
  providers: [GroupsService, CategoryService, FeaturedGroupsService, AdminGuard, JwtAuthGuard, PrismaService],
  exports: [GroupsService, CategoryService, FeaturedGroupsService],
})
export class GroupsModule {}



