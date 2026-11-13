import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetDto {
  @ApiProperty({ description: 'Email del usuario que olvidó la contraseña', format: 'email' })
  @IsEmail()
  email: string;
}
