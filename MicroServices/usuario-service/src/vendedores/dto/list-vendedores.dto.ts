import { IsOptional, IsInt, Min, IsString, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendedorEstado } from '@agua/contracts';

export class ListVendedoresDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Vendor status filter', enum: VendedorEstado, enumName: 'VendedorEstado' })
  @IsOptional()
  @IsEnum(VendedorEstado)
  estado?: VendedorEstado;

  @ApiPropertyOptional({ description: 'Search term', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
