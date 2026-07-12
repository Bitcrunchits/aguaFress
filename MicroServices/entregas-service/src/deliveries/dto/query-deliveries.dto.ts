import {ApiPropertyOptional} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min} from 'class-validator';
//Quité el idVendedor porque no es necesario para el query de entregas, ya que se obtiene del token del usuario logueado. 
export class QueryDeliveriesDto {
  @ApiPropertyOptional({
    description: 'Filtra las entregas por día. Formato YYYY-MM-DD,  Sin este parámetro devuelve las entregas del día actual',
    example: '2026-07-01',
     })
    @IsOptional()
    @IsDateString()
    fecha?: string;

    @ApiPropertyOptional({ default: 1})
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10})
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
