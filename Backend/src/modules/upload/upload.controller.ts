import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
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
  uploadGroupPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhuma foto foi enviada');
    }

    // Validar tipo de arquivo e obter extensão correspondente de forma segura
    const allowedMimes: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    const fileExt = allowedMimes[file.mimetype];
    if (!fileExt) {
      throw new BadRequestException('Apenas JPG, PNG e WebP são permitidos');
    }

    // Validar tamanho (máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Foto não pode exceder 5MB');
    }

    // Gerar nome único usando a extensão segura derivada do mimetype
    const fileName = `${uuid()}${fileExt}`;
    const filePath = path.join(process.cwd(), 'uploads', 'groups', fileName);

    // Criar diretório se não existir
    const uploadsDir = path.join(process.cwd(), 'uploads', 'groups');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Salvar arquivo
    fs.writeFileSync(filePath, file.buffer);

    // Retornar URL relativa
    const photoUrl = `uploads/groups/${fileName}`;

    return {
      success: true,
      message: 'Foto enviada com sucesso',
      photoUrl,
      fullUrl: `https://allgrops.onrender.com/${photoUrl}`,
    };
  }
}
