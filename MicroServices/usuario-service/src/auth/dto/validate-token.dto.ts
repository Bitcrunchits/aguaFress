import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateTokenDto {
  @ApiProperty({ description: 'JWT token to validate' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
