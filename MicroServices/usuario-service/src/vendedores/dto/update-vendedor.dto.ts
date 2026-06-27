import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVendedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudadDefault?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zonaEntrega?: string;
}
