import { IsEmail, IsString, IsEnum, IsBoolean, IsOptional, MinLength, MaxLength, Length } from 'class-validator';
import { UserRole, TipoFactura } from '@agua/contracts';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  // ─── CLIENTE fields (required when role=CLIENTE) ───

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  dni?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEnum(TipoFactura)
  tipoFactura?: TipoFactura;

  @IsOptional()
  @IsString()
  direccionCalle?: string;

  @IsOptional()
  @IsString()
  direccionNumero?: string;

  @IsOptional()
  @IsString()
  direccionCiudad?: string;

  @IsOptional()
  @IsString()
  direccionProvincia?: string;

  @IsOptional()
  @IsBoolean()
  mismaDireccionEntrega?: boolean;

  @IsOptional()
  @IsString()
  entregaCalle?: string;

  @IsOptional()
  @IsString()
  entregaNumero?: string;

  @IsOptional()
  @IsString()
  entregaCiudad?: string;

  @IsOptional()
  @IsString()
  entregaProvincia?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  qrToken?: string;
}
