import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendedorEstado } from '@agua/contracts';

export class ChangeEstadoDto {
  @ApiProperty({ description: 'New vendor status', enum: VendedorEstado, enumName: 'VendedorEstado' })
  @IsEnum(VendedorEstado)
  estado: VendedorEstado;

  @ApiPropertyOptional({ description: 'Reason for status change', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
