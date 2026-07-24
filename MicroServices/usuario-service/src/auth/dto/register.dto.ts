import { IsEmail, IsString, MinLength, MaxLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({ description: 'Email address', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Confirmación de email', format: 'email' })
  @IsEmail()
  @Match('email', { message: 'El email de confirmación no coincide' })
  emailConfirmation: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'First name', minLength: 2 })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ description: 'Last name', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido: string;

  @ApiProperty({ description: 'DNI (7 a 9 dígitos)', minLength: 7, maxLength: 9 })
  @IsString()
  @Length(7, 9)
  dni: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  telefono: string;

  @ApiProperty({ description: 'City', minLength: 2 })
  @IsString()
  @MinLength(2)
  ciudad: string;
}
