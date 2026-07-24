import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min} from 'class-validator';
import type { DeliveryListFilters } from '@agua/contracts';
//Quité el idVendedor porque no es necesario para el query de entregas, ya que se obtiene del token del usuario logueado.
export class QueryDeliveriesDto implements DeliveryListFilters {
    @IsOptional()
    @IsDateString()
    fecha?: string;

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
}
