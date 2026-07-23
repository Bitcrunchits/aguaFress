import type { SearchProductQuery } from '@agua/contracts';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProductDto implements SearchProductQuery {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsUUID()
  vendedorId?: string;

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
