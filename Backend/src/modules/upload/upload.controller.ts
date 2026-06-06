import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from '../../common/services/upload.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('group-photo')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo de imagem (JPG, PNG, WebP)',
        },
      },
    },
  })
  async uploadGroupPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhuma foto foi enviada');
    }

    // Validar tipo de arquivo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Apenas JPG, PNG e WebP são permitidos');
    }

    // Validar tamanho (máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Foto não pode exceder 5MB');
    }

    // Converter buffer para base64 e upload para Cloudinary
    const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const photoUrl = await this.uploadService.uploadBase64Image(base64String, 'groups');

    return {
      success: true,
      message: 'Foto enviada com sucesso',
      photoUrl,
    };
  }
}
