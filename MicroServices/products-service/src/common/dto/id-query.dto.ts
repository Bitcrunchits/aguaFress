import { IsUUID } from 'class-validator';

/**
 * DTO genérico para acciones que reciben un ID por query string.
 * Ej: GET /v1/products/get?id=xxx, PATCH /v1/categories/update?id=xxx
 */
export class IdQueryDto {
  @IsUUID()
  id!: string;
}
