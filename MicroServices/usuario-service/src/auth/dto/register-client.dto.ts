import { IsEmail, IsOptional, IsString, MaxLength, MinLength, IsNotEmpty, ValidateNested, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../decorators/match.decorator';
import type { DireccionEntrega } from '@agua/contracts';

export class DireccionEntregaDto implements DireccionEntrega {
  @ApiProperty({ description: 'Calle' })
  @IsString()
  @IsNotEmpty()
  calle!: string;

  @ApiProperty({ description: 'Número' })
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiPropertyOptional({ description: 'Piso / Depto' })
  @IsOptional()
  @IsString()
  pisoDepto?: string;

  @ApiPropertyOptional({ description: 'Referencia' })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional({ description: 'Barrio' })
  @IsOptional()
  @IsString()
  barrio?: string;

  @ApiProperty({ description: 'Ciudad' })
  @IsString()
  @IsNotEmpty()
  ciudad!: string;

  @ApiPropertyOptional({ description: 'Provincia' })
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({ description: 'Código postal' })
  @IsOptional()
  @IsString()
  codigoPostal?: string;

  @ApiPropertyOptional({ description: 'Latitud' })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitud' })
  @IsOptional()
  longitude?: number;
}

export class RegisterClientDto {
  @ApiPropertyOptional({ description: 'Token del link de invitación (requerido para registro vía link)' })
  @IsOptional()
  @IsString()
  token?: string;

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

  @ApiProperty({ description: 'DNI (7 a 9 dígitos)', minLength: 7, maxLength: 9 })
  @IsString()
  @IsNotEmpty()
  @Length(7, 9)
  dni!: string;

  @ApiProperty({ description: 'Dirección de entrega' })
  @ValidateNested()
  @Type(() => DireccionEntregaDto)
  @IsNotEmpty()
  direccionEntrega!: DireccionEntregaDto;
}
