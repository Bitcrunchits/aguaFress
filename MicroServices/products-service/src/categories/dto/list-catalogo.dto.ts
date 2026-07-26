import { IsOptional, IsUUID } from 'class-validator';

// Usado tanto para GET /categories como GET /brands.
// vendedorId es opcional: si el user está autenticado como VENDEDOR y no se pasa,
// se resuelve automáticamente del token.
export class ListCatalogoDto {
  @IsOptional()
  @IsUUID()
  vendedorId?: string;
}
