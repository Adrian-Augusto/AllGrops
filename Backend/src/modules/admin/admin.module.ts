import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { GroupsModule } from '../groups/group.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, AuthModule, GroupsModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
