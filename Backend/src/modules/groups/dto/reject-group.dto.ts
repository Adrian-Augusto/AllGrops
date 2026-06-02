import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectGroupDto {
  @ApiProperty()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({ example: 'Conteúdo inapropriado' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
