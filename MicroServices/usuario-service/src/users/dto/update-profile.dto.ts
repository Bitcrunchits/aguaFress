import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TipoFactura } from '@agua/contracts';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  @IsEnum(TipoFactura)
  tipoFactura?: TipoFactura;

  @IsOptional()
  address?: {
    calle?: string;
    numero?: string;
    pisoDepto?: string;
    referencia?: string;
    barrio?: string;
    ciudad?: string;
    provincia?: string;
    codigoPostal?: string;
    latitude?: number;
    longitude?: number;
  };
}
