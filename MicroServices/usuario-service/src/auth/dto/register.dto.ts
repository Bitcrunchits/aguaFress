import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
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

  @ApiProperty({ description: 'DNI (8 dígitos)', minLength: 8, maxLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(8)
  dni: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  telefono: string;

  @ApiProperty({ description: 'City', minLength: 2 })
  @IsString()
  @MinLength(2)
  ciudad: string;

  @ApiProperty({ description: 'Company or business name', maxLength: 255, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresa?: string;

}
