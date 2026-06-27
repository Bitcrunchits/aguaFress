import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

export class UpdateClienteVendedorDto {
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
  telefono?: string;

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
