import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VendedorEstado } from '@agua/contracts';

export class ChangeEstadoDto {
  @IsEnum(VendedorEstado)
  estado: VendedorEstado;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
