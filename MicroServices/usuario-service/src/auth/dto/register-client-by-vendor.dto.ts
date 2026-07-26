import { IsEmail, IsOptional, IsString, MaxLength, MinLength, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../decorators/match.decorator';
import { DireccionEntregaDto } from './register-client.dto';

/**
 * DTO para registro de cliente iniciado por un vendedor.
 * No requiere token de invitación — el vendedor autenticado resuelve su perfil.
 */
export class RegisterClientByVendorDto {
  @ApiProperty({ description: 'Nombre', minLength: 2 })
  @IsString()
  @MinLength(2)
  nombre!: string;

  @ApiPropertyOptional({ description: 'Apellido', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;

  @ApiProperty({ description: 'Email', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Confirmación de email', format: 'email' })
  @IsEmail()
  @Match('email', { message: 'El email de confirmación no coincide' })
  emailConfirmation!: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Teléfono' })
  @IsString()
  @IsNotEmpty()
  telefono!: string;

  @ApiProperty({ description: 'DNI (8 dígitos)', minLength: 8, maxLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(8)
  dni!: string;

  @ApiProperty({ description: 'Dirección de entrega' })
  @ValidateNested()
  @Type(() => DireccionEntregaDto)
  @IsNotEmpty()
  direccionEntrega!: DireccionEntregaDto;
}
