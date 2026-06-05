import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadBase64Image(base64String: string, folder: string = 'groups'): Promise<string> {
    try {
      // Check if it's already a URL
      if (!base64String?.startsWith('data:image/')) {
        return base64String;
      }

      const match = base64String.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
      if (!match) {
        throw new BadRequestException('Formato da foto inválido');
      }

      const mime = match[1];
      const base64 = match[2];
      const buffer = Buffer.from(base64, 'base64');
      const maxSize = 5 * 1024 * 1024;

      if (buffer.length > maxSize) {
        throw new BadRequestException('Foto não pode exceder 5MB');
      }

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(
          `data:${mime};base64,${base64}`,
          {
            folder: `allgrops/${folder}`,
            resource_type: 'image',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto' },
            ],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );
      });

      this.logger.log(`Image uploaded to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      this.logger.error('Error uploading image to Cloudinary:', error);
      throw new BadRequestException('Erro ao fazer upload da imagem');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting image from Cloudinary:', error);
    }
  }
}
