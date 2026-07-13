import type { CreateProductRequest } from '@agua/contracts';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

// Implementa CreateProductRequest de @agua/contracts.
// vendedorId NO está acá a propósito: nunca viene del body (regla de seguridad
// del contrato) — se inyecta server-side desde el JWT (payload.user, vía TCP).
export class CreateProductDto implements CreateProductRequest {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioSinIva!: number;

  @IsUUID()
  categoriaId!: string;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @IsOptional()
  @IsUrl()
  imagen?: string;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsBoolean()
  mostrarPrecio?: boolean;
}
