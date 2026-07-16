import { BadRequestException } from '@nestjs/common';
import { MetodoPago, OrderEstado, type DireccionEntrega } from '@agua/contracts';

export interface OrderItemResponse {
  readonly productId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export interface OrderResponse {
  readonly id: string;
  readonly pedidoNumero: string;
  readonly clienteId: string;
  readonly vendedorId: string;
  readonly items: readonly OrderItemResponse[];
  readonly totalSinIva: number;
  readonly iva: number;
  readonly total: number;
  readonly estado: OrderEstado;
  readonly metodoPago: MetodoPago.CONTRA_ENTREGA;
  readonly direccion: DireccionEntrega;
  readonly observaciones?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateOrderRequest extends Record<string, unknown> {
  readonly metodoPago: MetodoPago.CONTRA_ENTREGA;
  readonly direccion: DireccionEntrega;
  readonly observaciones?: string;
}

export interface UpdateOrderStatusRequest extends Record<string, unknown> {
  readonly id: string;
  readonly estado: OrderEstado;
  readonly notas?: string;
}

export interface CancelOrderRequest extends Record<string, unknown> {
  readonly id: string;
  readonly motivo?: string;
}

export interface ConfirmOrderRequest extends Record<string, unknown> {
  readonly id: string;
}

export function parseCreateOrderRequest(value: unknown): CreateOrderRequest {
  const record = requireRecord(value);
  const metodoPago = readMetodoPago(record, 'metodoPago');
  const direccion = readDireccion(record, 'direccion');
  const observaciones = readOptionalString(record, 'observaciones');

  return { metodoPago, direccion, observaciones };
}

export function parseUpdateOrderStatusRequest(value: unknown): UpdateOrderStatusRequest {
  const record = requireRecord(value);
  return {
    id: readRequiredString(record, 'id'),
    estado: readOrderEstado(record, 'estado'),
    notas: readOptionalString(record, 'notas'),
  };
}

export function parseCancelOrderRequest(value: unknown): CancelOrderRequest {
  const record = requireRecord(value);
  return {
    id: readRequiredString(record, 'id'),
    motivo: readOptionalString(record, 'motivo'),
  };
}

export function parseConfirmOrderRequest(value: unknown): ConfirmOrderRequest {
  const record = requireRecord(value);
  return { id: readRequiredString(record, 'id') };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException('Request body must be an object');
  }

  return value;
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

function readMetodoPago(record: Record<string, unknown>, key: string): MetodoPago.CONTRA_ENTREGA {
  const value = record[key];
  if (value !== MetodoPago.CONTRA_ENTREGA) {
    throw new BadRequestException(`${key} must be ${MetodoPago.CONTRA_ENTREGA}`);
  }

  return MetodoPago.CONTRA_ENTREGA;
}

function readOrderEstado(record: Record<string, unknown>, key: string): OrderEstado {
  const value = record[key];
  if (typeof value !== 'string' || !Object.values(OrderEstado).includes(value as OrderEstado)) {
    throw new BadRequestException(`${key} must be a valid order status`);
  }

  return value as OrderEstado;
}

function readDireccion(record: Record<string, unknown>, key: string): DireccionEntrega {
  const value = record[key];
  if (!isRecord(value)) {
    throw new BadRequestException(`${key} is required`);
  }

  return {
    calle: readRequiredString(value, 'calle'),
    numero: readRequiredString(value, 'numero'),
    pisoDepto: readOptionalString(value, 'pisoDepto'),
    referencia: readOptionalString(value, 'referencia'),
    barrio: readOptionalString(value, 'barrio'),
    ciudad: readOptionalString(value, 'ciudad'),
    provincia: readOptionalString(value, 'provincia'),
    codigoPostal: readOptionalString(value, 'codigoPostal'),
    latitude: readOptionalNumber(value, 'latitude'),
    longitude: readOptionalNumber(value, 'longitude'),
  };
}

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number') {
    throw new BadRequestException(`${key} must be a number`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
