import { BadRequestException } from '@nestjs/common';

export interface CartItemResponse {
  readonly id: string;
  readonly productoId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly subtotal: number;
}

export interface CartResponse {
  readonly id: string;
  /** V1 compatibility: AUTH_USER.id of the cliente, not CLIENTE.id. */
  readonly clienteId: string;
  readonly vendedorId: string;
  readonly expiresAt: string;
  readonly items: readonly CartItemResponse[];
  readonly total: number;
}

export interface AddCartItemRequest extends Record<string, unknown> {
  readonly vendedorId: string;
  readonly cartId?: string;
  readonly productoId: string;
  readonly cantidad: number;
}

export interface UpdateCartItemRequest extends Record<string, unknown> {
  readonly vendedorId: string;
  readonly cartId: string;
  readonly productoId: string;
  readonly cantidad: number;
}

export interface DeleteCartItemRequest extends Record<string, unknown> {
  readonly vendedorId: string;
  readonly cartId: string;
  readonly productoId: string;
}

export interface GetCartRequest {
  readonly vendedorId: string;
}

export function parseAddCartItemRequest(value: unknown): AddCartItemRequest {
  const record = requireRecord(value);
  rejectUnexpectedFields(record, ['cartId', 'vendedorId', 'productoId', 'cantidad']);
  return {
    cartId: readOptionalString(record, 'cartId'),
    vendedorId: readRequiredString(record, 'vendedorId'),
    productoId: readRequiredString(record, 'productoId'),
    cantidad: readPositiveInteger(record, 'cantidad'),
  };
}

export function parseUpdateCartItemRequest(value: unknown): UpdateCartItemRequest {
  const record = requireRecord(value);
  rejectUnexpectedFields(record, ['cartId', 'vendedorId', 'productoId', 'cantidad']);
  return {
    cartId: readRequiredString(record, 'cartId'),
    vendedorId: readRequiredString(record, 'vendedorId'),
    productoId: readRequiredString(record, 'productoId'),
    cantidad: readPositiveInteger(record, 'cantidad'),
  };
}

export function parseDeleteCartItemRequest(value: unknown): DeleteCartItemRequest {
  const record = requireRecord(value);
  rejectUnexpectedFields(record, ['cartId', 'vendedorId', 'productoId']);
  return {
    cartId: readRequiredString(record, 'cartId'),
    vendedorId: readRequiredString(record, 'vendedorId'),
    productoId: readRequiredString(record, 'productoId'),
  };
}

export function parseGetCartRequest(value: unknown): GetCartRequest {
  const record = requireRecord(value);
  rejectUnexpectedFields(record, ['vendedorId']);
  return { vendedorId: readRequiredString(record, 'vendedorId') };
}

function rejectUnexpectedFields(record: Record<string, unknown>, allowedFields: readonly string[]): void {
  for (const key of Object.keys(record)) {
    if (!allowedFields.includes(key)) {
      throw new BadRequestException(`property ${key} should not exist`);
    }
  }
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException('Request body must be an object');
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${key} is required`);
  }

  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${key} must be a non-empty string`);
  }

  return value;
}

function readPositiveInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1) {
    throw new BadRequestException(`${key} must be a positive integer`);
  }

  return value;
}
