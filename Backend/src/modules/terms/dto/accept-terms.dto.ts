import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AcceptTermsDto {
  @ApiProperty({
    example: true,
    description: 'Checkbox de aceitação dos termos',
  })
  @IsBoolean()
  @IsNotEmpty()
  accepted: boolean;
}
