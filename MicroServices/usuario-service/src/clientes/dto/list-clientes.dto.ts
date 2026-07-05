import { IsOptional, IsInt, Min, Max, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListClientesDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Vendor ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vendedorId?: string;

  @ApiPropertyOptional({ description: 'Search term', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
