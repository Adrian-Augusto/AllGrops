import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { ImagesController } from './image-proxy.controller';

@Module({
  imports: [
    MulterModule.register({
      storage: require('multer').memoryStorage(),
    }),
  ],
  controllers: [UploadController, ImagesController],
})
export class UploadModule {}
