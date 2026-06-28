import { IsOptional, IsInt, Min, Max, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ListClientesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  vendedorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
