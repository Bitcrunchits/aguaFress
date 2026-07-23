import type { SearchProductQuery } from '@agua/contracts';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchProductDto implements SearchProductQuery {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsUUID()
  vendedorId?: string;
}
