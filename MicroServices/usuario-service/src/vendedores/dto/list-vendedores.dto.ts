import { IsOptional, IsInt, Min, IsString, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { VendedorEstado } from '@agua/contracts';

export class ListVendedoresDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(VendedorEstado)
  estado?: VendedorEstado;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
