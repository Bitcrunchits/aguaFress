import type { ProductListFilters } from '@agua/contracts';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListProductsDto implements ProductListFilters {
  @IsOptional()
  @IsUUID()
  vendedorId?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

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
