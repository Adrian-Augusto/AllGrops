import { Module } from '@nestjs/common';
import { CommunitiesController } from './community.controller';
import { CommunitiesService } from './community.service';
import { UsersModule } from '../users/user.module';

@Module({
  imports: [UsersModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
