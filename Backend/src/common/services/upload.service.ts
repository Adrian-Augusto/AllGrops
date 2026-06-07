import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// @ts-ignore - Cloudinary v2 has built-in types but TypeScript may not resolve them correctly
const cloudinary = require('cloudinary').v2;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    const rawCloudName = this.configService.get('CLOUDINARY_CLOUD_NAME') || '';
    const rawApiKey = this.configService.get('CLOUDINARY_API_KEY') || '';
    const rawApiSecret = this.configService.get('CLOUDINARY_API_SECRET') || '';

    // Remove espaços em branco e aspas (comum de acontecer ao copiar pro Render)
    const cloudName = rawCloudName.trim().replace(/^["'](.*)["']$/, '$1');
    const apiKey = rawApiKey.trim().replace(/^["'](.*)["']$/, '$1');
    const apiSecret = rawApiSecret.trim().replace(/^["'](.*)["']$/, '$1');

    this.logger.log(`Cloudinary config - cloud_name: ${cloudName}, api_key: ${apiKey ? 'configured' : 'not configured'}, api_secret: ${apiSecret ? `configured (starts with: ${apiSecret.substring(0, 2)}, ends with: ${apiSecret.substring(apiSecret.length - 2)}, length: ${apiSecret.length})` : 'not configured'}`);

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('Cloudinary credentials not configured properly');
    }

    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary configured successfully');
    } catch (error) {
      this.logger.error('Error configuring Cloudinary:', error);
    }
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
      const rawCloudName = this.configService.get('CLOUDINARY_CLOUD_NAME') || '';
      const rawApiKey = this.configService.get('CLOUDINARY_API_KEY') || '';
      const rawApiSecret = this.configService.get('CLOUDINARY_API_SECRET') || '';

      const cloudName = rawCloudName.trim().replace(/^["'](.*)["']$/, '$1');
      const apiKey = rawApiKey.trim().replace(/^["'](.*)["']$/, '$1');
      const apiSecret = rawApiSecret.trim().replace(/^["'](.*)["']$/, '$1');

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
      this.logger.log('Starting Cloudinary upload with explicit credentials...');
      try {
        const result = await cloudinary.uploader.upload(
          `data:${mime};base64,${base64}`,
          {
            folder: `allgrops/${folder}`,
            resource_type: 'image',
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
          },
        );
        this.logger.log(`Cloudinary upload successful: ${result.secure_url}`);
        return result.secure_url;
      } catch (error: any) {
        this.logger.error('Cloudinary upload error:', {
          message: error.message,
          code: error.code,
          http_code: error.http_code,
        });
        throw error;
      }
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
      const rawCloudName = this.configService.get('CLOUDINARY_CLOUD_NAME') || '';
      const rawApiKey = this.configService.get('CLOUDINARY_API_KEY') || '';
      const rawApiSecret = this.configService.get('CLOUDINARY_API_SECRET') || '';

      const cloudName = rawCloudName.trim().replace(/^["'](.*)["']$/, '$1');
      const apiKey = rawApiKey.trim().replace(/^["'](.*)["']$/, '$1');
      const apiSecret = rawApiSecret.trim().replace(/^["'](.*)["']$/, '$1');

      await cloudinary.uploader.destroy(publicId, {
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting image from Cloudinary:', error);
    }
  }
}
