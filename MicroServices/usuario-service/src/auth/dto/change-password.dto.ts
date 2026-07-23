import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual', minLength: 6 })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
