import { IsUUID } from 'class-validator';

// Usado tanto para GET /categories como GET /brands — ambos piden vendedorId.
export class ListCatalogoDto {
  @IsUUID()
  vendedorId!: string;
}
