import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { ImagesController } from './image-proxy.controller';
import { UploadService } from '../../common/services/upload.service';

@Module({
  imports: [
    MulterModule.register({
      storage: require('multer').memoryStorage(),
    }),
  ],
  controllers: [UploadController, ImagesController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
