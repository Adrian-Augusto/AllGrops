import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Grupo de Tecnologia' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Grupo para discutir tecnologia e programação.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/grupo-tech' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  link: string;

  @ApiProperty({ example: 'Discord', description: 'Plataforma do grupo (Discord, Telegram, WhatsApp, etc.)' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ 
    example: 'uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg', 
    description: 'Caminho relativo da foto (retornado após upload em POST /upload/group-photo)' 
  })
  @IsString()
  @IsNotEmpty()
  photoUrl: string;

  @ApiProperty({ example: 'category-456', required: false, nullable: true, description: 'ID da categoria (deixar em branco se não houver)' })
  @IsString()
  @IsOptional()
  categoryId?: string | null;
}
