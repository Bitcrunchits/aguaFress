import type { CreateProductRequest } from '@agua/contracts';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

// Implementa CreateProductRequest de @agua/contracts.
// vendedorId NO está acá a propósito: nunca viene del body (regla de seguridad
// del contrato) — se inyecta server-side desde el JWT (payload.user, vía TCP).
export class CreateProductDto implements CreateProductRequest {
  @IsString()
  @MaxLength(255)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioSinIva!: number;

  @IsUUID()
  // categoriaId es required en la API, pero nullable en Prisma (String?)
  // para soportar onDelete: SetNull cuando se elimina una categoría.
  categoriaId!: string;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  imagen?: string;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsBoolean()
  mostrarPrecio?: boolean;
}
