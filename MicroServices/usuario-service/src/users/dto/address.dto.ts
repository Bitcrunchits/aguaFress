import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiPropertyOptional({ description: 'Street name' })
  @IsOptional()
  @IsString()
  calle?: string;

  @ApiPropertyOptional({ description: 'Street number' })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({ description: 'Floor / Apartment' })
  @IsOptional()
  @IsString()
  pisoDepto?: string;

  @ApiPropertyOptional({ description: 'Landmark reference' })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional({ description: 'Neighborhood' })
  @IsOptional()
  @IsString()
  barrio?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({ description: 'ZIP / Postal code' })
  @IsOptional()
  @IsString()
  codigoPostal?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;
}
