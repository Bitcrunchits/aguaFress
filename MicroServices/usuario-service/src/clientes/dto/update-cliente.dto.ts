import { IsOptional, IsString, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { TipoFactura } from '@agua/contracts';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEnum(TipoFactura)
  tipoFactura?: TipoFactura;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionCalle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  direccionNumero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  direccionPiso?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionReferencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccionBarrio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccionCiudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccionProvincia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  direccionCp?: string;

  @IsOptional()
  @IsNumber()
  latitud?: number;

  @IsOptional()
  @IsNumber()
  longitud?: number;
}
