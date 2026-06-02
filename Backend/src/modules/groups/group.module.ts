import { Module } from '@nestjs/common';
import { GroupsController } from './group.controller';
import { AdminGroupsController } from './admin-group.controller';
import { GroupsService } from './group.service';
import { FeaturedGroupsService } from './featured-groups.service';
import { AdminGuard } from '../admin/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [GroupsController, AdminGroupsController],
  providers: [GroupsService, FeaturedGroupsService, AdminGuard, JwtAuthGuard, PrismaService],
  exports: [GroupsService, FeaturedGroupsService],
})
export class GroupsModule {}



