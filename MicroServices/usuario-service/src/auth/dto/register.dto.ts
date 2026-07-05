import { IsEmail, IsString, IsEnum, IsBoolean, IsOptional, MinLength, MaxLength, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, TipoFactura } from '@agua/contracts';

export class RegisterDto {
  @ApiProperty({ description: 'Email address', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'First name', minLength: 2 })
  @IsString()
  @MinLength(2)
  nombre: string;

  // ─── CLIENTE fields (required when role=CLIENTE) ───

  @ApiPropertyOptional({ description: 'Last name', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ description: 'DNI', minLength: 8, maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  dni?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Invoice type', enum: TipoFactura, enumName: 'TipoFactura' })
  @IsOptional()
  @IsEnum(TipoFactura)
  tipoFactura?: TipoFactura;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  direccionCalle?: string;

  @ApiPropertyOptional({ description: 'Street number' })
  @IsOptional()
  @IsString()
  direccionNumero?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  direccionCiudad?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  direccionProvincia?: string;

  @ApiPropertyOptional({ description: 'Same address for delivery' })
  @IsOptional()
  @IsBoolean()
  mismaDireccionEntrega?: boolean;

  @ApiPropertyOptional({ description: 'Delivery street address' })
  @IsOptional()
  @IsString()
  entregaCalle?: string;

  @ApiPropertyOptional({ description: 'Delivery street number' })
  @IsOptional()
  @IsString()
  entregaNumero?: string;

  @ApiPropertyOptional({ description: 'Delivery city' })
  @IsOptional()
  @IsString()
  entregaCiudad?: string;

  @ApiPropertyOptional({ description: 'Delivery province' })
  @IsOptional()
  @IsString()
  entregaProvincia?: string;

  @ApiProperty({ description: 'User role', enum: UserRole, enumName: 'UserRole' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'QR token' })
  @IsOptional()
  @IsString()
  qrToken?: string;
}
