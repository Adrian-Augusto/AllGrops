import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// @ts-ignore - Cloudinary v2 has built-in types but TypeScript may not resolve them correctly
const cloudinary = require('cloudinary').v2;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    this.logger.log(`Cloudinary config - cloud_name: ${cloudName}, api_key: ${apiKey ? 'configured' : 'not configured'}, api_secret: ${apiSecret ? 'configured' : 'not configured'}`);

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('Cloudinary credentials not configured properly');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadBase64Image(base64String: string, folder: string = 'groups'): Promise<string> {
    try {
      this.logger.log(`Starting image upload to Cloudinary, folder: ${folder}, string length: ${base64String?.length || 0}`);

      // Check if it's already a URL
      if (!base64String?.startsWith('data:image/')) {
        this.logger.log('Image is already a URL, skipping upload');
        return base64String;
      }

      // Check if Cloudinary is configured
      const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get('CLOUDINARY_API_KEY');
      const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

      if (!cloudName || !apiKey || !apiSecret) {
        this.logger.error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
        throw new BadRequestException('Cloudinary not configured. Please contact administrator.');
      }

      this.logger.log(`Cloudinary configured - cloud_name: ${cloudName}`);

      const match = base64String.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
      if (!match) {
        this.logger.error('Invalid image format');
        throw new BadRequestException('Formato da foto inválido');
      }

      const mime = match[1];
      const base64 = match[2];
      const buffer = Buffer.from(base64, 'base64');
      const maxSize = 5 * 1024 * 1024;

      this.logger.log(`Image details - mime: ${mime}, buffer size: ${buffer.length} bytes`);

      if (buffer.length > maxSize) {
        this.logger.error(`Image too large: ${buffer.length} bytes`);
        throw new BadRequestException('Foto não pode exceder 5MB');
      }

      // Upload to Cloudinary
      this.logger.log('Starting Cloudinary upload...');
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
          (error: any, result: any) => {
            if (error) {
              this.logger.error('Cloudinary upload error:', {
                message: error.message,
                code: error.code,
                http_code: error.http_code,
              });
              reject(error);
            } else {
              this.logger.log('Cloudinary upload successful');
              resolve(result);
            }
          },
        );
      });

      this.logger.log(`Image uploaded to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      this.logger.error('Error uploading image to Cloudinary:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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
