import { IsOptional, IsString, IsBoolean, IsEnum, IsNumber, MaxLength, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoFactura } from '@agua/contracts';

export class UpdateClienteDto {
  @ApiPropertyOptional({ description: 'First name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Last name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ description: 'DNI', minLength: 8, maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  dni?: string;

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Invoice type', enum: TipoFactura, enumName: 'TipoFactura' })
  @IsOptional()
  @IsEnum(TipoFactura)
  tipoFactura?: TipoFactura;

  @ApiPropertyOptional({ description: 'Street address', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccionCalle?: string;

  @ApiPropertyOptional({ description: 'Street number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  direccionNumero?: string;

  @ApiPropertyOptional({ description: 'Floor / Apartment', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  direccionPiso?: string;

  @ApiPropertyOptional({ description: 'Landmark reference', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionReferencia?: string;

  @ApiPropertyOptional({ description: 'Neighborhood', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccionBarrio?: string;

  @ApiPropertyOptional({ description: 'City', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccionCiudad?: string;

  @ApiPropertyOptional({ description: 'Province', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  direccionProvincia?: string;

  @ApiPropertyOptional({ description: 'ZIP / Postal code', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  direccionCp?: string;

  @ApiPropertyOptional({ description: 'Same address for delivery' })
  @IsOptional()
  @IsBoolean()
  mismaDireccionEntrega?: boolean;

  @ApiPropertyOptional({ description: 'Delivery street address', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  entregaCalle?: string;

  @ApiPropertyOptional({ description: 'Delivery street number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  entregaNumero?: string;

  @ApiPropertyOptional({ description: 'Delivery floor / Apartment', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  entregaPiso?: string;

  @ApiPropertyOptional({ description: 'Delivery landmark reference', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entregaReferencia?: string;

  @ApiPropertyOptional({ description: 'Delivery neighborhood', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entregaBarrio?: string;

  @ApiPropertyOptional({ description: 'Delivery city', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entregaCiudad?: string;

  @ApiPropertyOptional({ description: 'Delivery province', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entregaProvincia?: string;

  @ApiPropertyOptional({ description: 'Delivery ZIP / Postal code', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  entregaCp?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitud?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitud?: number;
}
