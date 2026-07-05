import { IsOptional, IsString, MaxLength, Length } from 'class-validator';

export class UpdateVendedorProfileDto {
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
  @Length(8, 8)
  dni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudadDefault?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zonaEntrega?: string;
}
