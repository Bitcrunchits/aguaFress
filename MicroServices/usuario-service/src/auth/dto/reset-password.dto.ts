import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de reset (one-time)' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Nueva contraseña', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
