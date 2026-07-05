import { IsOptional, IsString, MaxLength, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVendedorDto {
  @ApiPropertyOptional({ description: 'Company name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresa?: string;

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ description: 'DNI', minLength: 8, maxLength: 8 })
  @IsOptional()
  @IsString()
  @Length(8, 8)
  dni?: string;

  @ApiPropertyOptional({ description: 'CUIL', maxLength: 15 })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuil?: string;

  @ApiPropertyOptional({ description: 'CUIT', maxLength: 15 })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuit?: string;

  @ApiPropertyOptional({ description: 'Logo URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @ApiPropertyOptional({ description: 'Default city', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudadDefault?: string;

  @ApiPropertyOptional({ description: 'Delivery zone', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zonaEntrega?: string;
}
