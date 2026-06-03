import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    example: 'Grupo de Tecnologia',
    description: 'Nome/título do grupo'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Grupo para discutir tecnologia e programação.',
    description: 'Descrição do grupo'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'https://discord.gg/xyz',
    description: 'Link do grupo'
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  link: string;

  @ApiProperty({
    example: 'Discord',
    description: 'Plataforma (Discord, Telegram, WhatsApp, etc.)'
  })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({
    example: 'https://cdn.example.com/photo.jpg ou data:image/jpeg;base64,...',
    description: 'URL da foto ou base64 da imagem'
  })
  @IsString()
  @IsNotEmpty()
  photoUrl: string;

  @ApiProperty({
    example: 'Tecnologia',
    description: 'Nome da categoria (será criada automaticamente se não existir)',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  category: string;
}
