import type { ProductListFilters } from '@agua/contracts';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// NOTA: el gateway no soporta rutas dinámicas tipo /products/:id — todo id
// viaja por query string (ej. GET /v1/products/get?id=xxx). Por eso los DTOs
// de get/update/delete leen `id` desde query, no desde params.
export class IdQueryDto {
  @IsUUID()
  id!: string;
}

export class ListProductsDto implements ProductListFilters {
  @IsOptional()
  @IsUUID()
  vendedorId?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  disponibles?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
