import { BadRequestException, Injectable } from '@nestjs/common';
import { MetodoPago, OrderEstado, OrderJobStatus, type DireccionEntrega } from '@agua/contracts';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma.service';
import type { CartRecord } from '../cart/cart.repository';
import { toDireccionEntrega } from './orders.mapper';

export interface CreateOrderItemInput {
  readonly productoId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export interface CreateOrderFromCartInput {
  /** V1 compatibility: authenticated cliente user id (AUTH_USER.id), not CLIENTE.id. */
  readonly clienteId: string;
  readonly now: Date;
  readonly validateCartItems: (cart: CartRecord) => Promise<void>;
  readonly metodoPago: MetodoPago.CONTRA_ENTREGA;
  readonly direccion: DireccionEntrega;
  readonly observaciones?: string;
}

export interface OrderItemRecord {
  readonly id: string;
  readonly productoId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export interface OrderRecord {
  readonly id: string;
  readonly pedidoNumero: string;
  readonly usuarioId: string;
  readonly vendedorId: string;
  readonly estado: OrderEstado;
  readonly metodoPago: MetodoPago.CONTRA_ENTREGA;
  readonly direccion: DireccionEntrega;
  readonly observaciones: string | null;
  readonly totalSinIva: number;
  readonly iva: number;
  readonly total: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly items: readonly OrderItemRecord[];
}

export interface CreateOrderCommandJobInput {
  readonly trackingId: string;
  readonly jobId: string;
  /** V1 compatibility: authenticated cliente user id (AUTH_USER.id), not CLIENTE.id. */
  readonly clienteId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly payloadBody: Prisma.InputJsonObject;
  readonly status: OrderJobStatus.PENDING;
}

export interface UpdateOrderCommandJobStatusInput {
  readonly trackingId: string;
  readonly previousStatus: OrderJobStatus;
  readonly nextStatus: OrderJobStatus;
  readonly orderId?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly attempts?: number;
}

export interface OrderCommandJobRecord {
  readonly id: string;
  readonly trackingId: string;
  readonly jobId: string;
  /** V1 compatibility: authenticated cliente user id (AUTH_USER.id), not CLIENTE.id. */
  readonly clienteId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly status: OrderJobStatus;
  readonly orderId: string | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly attempts: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrdersRepository {
  createFromCart(input: CreateOrderFromCartInput): Promise<OrderRecord>;
  createOrderCommandJob(input: CreateOrderCommandJobInput): Promise<OrderCommandJobRecord>;
  findOrderCommandByIdempotency(clienteUserId: string, idempotencyKey: string): Promise<OrderCommandJobRecord | null>;
  findOrderCommandByTrackingId(trackingId: string): Promise<OrderCommandJobRecord | null>;
  updateOrderCommandJobStatus(input: UpdateOrderCommandJobStatusInput): Promise<OrderCommandJobRecord | null>;
  findById(orderId: string): Promise<OrderRecord | null>;
  findMany(): Promise<readonly OrderRecord[]>;
  findManyForCliente(clienteUserId: string): Promise<readonly OrderRecord[]>;
  findManyForVendedor(vendedorId: string): Promise<readonly OrderRecord[]>;
  updateStatus(orderId: string, previous: OrderEstado, next: OrderEstado, notes?: string): Promise<OrderRecord>;
}

const ORDER_WITH_ITEMS = {
  items: true,
} satisfies Prisma.OrderInclude;

type PrismaOrderWithItems = Prisma.OrderGetPayload<{ include: typeof ORDER_WITH_ITEMS }>;

interface DecimalLike {
  toNumber(): number;
}

const IVA_RATE = 0.21;

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFromCart(input: CreateOrderFromCartInput): Promise<OrderRecord> {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: {
          usuario_id: input.clienteId,
          active_cart_key: input.clienteId,
          expires_at: { gt: input.now },
        },
        include: { items: true },
        orderBy: { updated_at: 'desc' },
      });

      if (cart === null || cart.items.length === 0) {
        throw new BadRequestException('Active cart is not available for checkout');
      }

      const cartRecord = mapCart(cart);
      await input.validateCartItems(cartRecord);

      const counter = await tx.orderCounter.upsert({
        where: { vendedor_id: cartRecord.vendedorId },
        update: { current_value: { increment: 1 } },
        create: { vendedor_id: cartRecord.vendedorId, current_value: 1 },
      });
      const items = cartRecord.items.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      }));
      const total = calculateTotal(items);
      const totalSinIva = roundMoney(total / (1 + IVA_RATE));
      const iva = roundMoney(total - totalSinIva);

      const order = await tx.order.create({
        data: {
          pedido_numero: formatPedidoNumero(counter.current_value),
          usuario_id: cartRecord.usuarioId,
          vendedor_id: cartRecord.vendedorId,
          direccion_entrega: toJsonObject(input.direccion),
          estado: OrderEstado.PENDIENTE,
          metodo_pago: input.metodoPago,
          total_sin_iva: totalSinIva,
          iva,
          total,
          observaciones: input.observaciones,
          items: {
            create: items.map((item) => ({
              producto_id: item.productoId,
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio_unitario: item.precioUnitario,
            })),
          },
          history: {
            create: [{ estado_anterior: null, estado_nuevo: OrderEstado.PENDIENTE, notas: 'Order created' }],
          },
        },
        include: ORDER_WITH_ITEMS,
      });

      await tx.cart.delete({ where: { id: cartRecord.id } });

      return mapOrder(order);
    });
  }

  async createOrderCommandJob(input: CreateOrderCommandJobInput): Promise<OrderCommandJobRecord> {
    const job = await this.prisma.orderCommandJob.create({
      data: {
        tracking_id: input.trackingId,
        job_id: input.jobId,
        cliente_id: input.clienteId,
        idempotency_key: input.idempotencyKey,
        payload_hash: input.payloadHash,
        payload_body: input.payloadBody,
        status: input.status,
      },
    });

    return mapOrderCommandJob(job);
  }

  async findOrderCommandByIdempotency(clienteUserId: string, idempotencyKey: string): Promise<OrderCommandJobRecord | null> {
    const job = await this.prisma.orderCommandJob.findUnique({
      where: { cliente_id_idempotency_key: { cliente_id: clienteUserId, idempotency_key: idempotencyKey } },
    });

    return job === null ? null : mapOrderCommandJob(job);
  }

  async findOrderCommandByTrackingId(trackingId: string): Promise<OrderCommandJobRecord | null> {
    const job = await this.prisma.orderCommandJob.findUnique({ where: { tracking_id: trackingId } });
    return job === null ? null : mapOrderCommandJob(job);
  }

  async updateOrderCommandJobStatus(input: UpdateOrderCommandJobStatusInput): Promise<OrderCommandJobRecord | null> {
    const updateResult = await this.prisma.orderCommandJob.updateMany({
      where: { tracking_id: input.trackingId, status: input.previousStatus },
      data: cleanUpdateInput({
        status: input.nextStatus,
        order_id: input.orderId,
        error_code: input.errorCode,
        error_message: input.errorMessage,
        attempts: input.attempts,
      }),
    });

    if (updateResult.count !== 1) {
      return null;
    }

    return this.findOrderCommandByTrackingId(input.trackingId);
  }

  async findById(orderId: string): Promise<OrderRecord | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_WITH_ITEMS,
    });

    return order === null ? null : mapOrder(order);
  }

  async findMany(): Promise<readonly OrderRecord[]> {
    const orders = await this.prisma.order.findMany({
      include: ORDER_WITH_ITEMS,
      orderBy: { created_at: 'desc' },
    });

    return orders.map(mapOrder);
  }

  async findManyForCliente(clienteUserId: string): Promise<readonly OrderRecord[]> {
    const orders = await this.prisma.order.findMany({
      where: { usuario_id: clienteUserId },
      include: ORDER_WITH_ITEMS,
      orderBy: { created_at: 'desc' },
    });

    return orders.map(mapOrder);
  }

  async findManyForVendedor(vendedorId: string): Promise<readonly OrderRecord[]> {
    const orders = await this.prisma.order.findMany({
      where: { vendedor_id: vendedorId },
      include: ORDER_WITH_ITEMS,
      orderBy: { created_at: 'desc' },
    });

    return orders.map(mapOrder);
  }

  async updateStatus(orderId: string, previous: OrderEstado, next: OrderEstado, notes?: string): Promise<OrderRecord> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: { id: orderId, estado: previous },
        data: { estado: next },
      });

      if (updateResult.count !== 1) {
        throw new BadRequestException('Order status changed before update');
      }

      await tx.orderHistory.create({
        data: { order_id: orderId, estado_anterior: previous, estado_nuevo: next, notas: notes },
      });

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: ORDER_WITH_ITEMS,
      });

      if (order === null) {
        throw new BadRequestException('Order was not found after status update');
      }

      return mapOrder(order);
    });
  }
}

function mapCart(cart: Prisma.CartGetPayload<{ include: { items: true } }>): CartRecord {
  return {
    id: cart.id,
    usuarioId: cart.usuario_id,
    vendedorId: cart.vendedor_id,
    expiresAt: cart.expires_at,
    items: cart.items.map((item) => ({
      id: item.id,
      productoId: item.producto_id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: decimalToNumber(item.precio_unitario),
    })),
  };
}

function mapOrder(order: PrismaOrderWithItems): OrderRecord {
  return {
    id: order.id,
    pedidoNumero: order.pedido_numero,
    usuarioId: order.usuario_id,
    vendedorId: order.vendedor_id,
    estado: order.estado as OrderEstado,
    metodoPago: order.metodo_pago as MetodoPago.CONTRA_ENTREGA,
    direccion: toDireccionEntrega(order.direccion_entrega),
    observaciones: order.observaciones,
    totalSinIva: decimalToNumber(order.total_sin_iva),
    iva: decimalToNumber(order.iva),
    total: decimalToNumber(order.total),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: order.items.map((item) => ({
      id: item.id,
      productoId: item.producto_id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: decimalToNumber(item.precio_unitario),
    })),
  };
}

function mapOrderCommandJob(job: Prisma.OrderCommandJobGetPayload<object>): OrderCommandJobRecord {
  return {
    id: job.id,
    trackingId: job.tracking_id,
    jobId: job.job_id,
    clienteId: job.cliente_id,
    idempotencyKey: job.idempotency_key,
    payloadHash: job.payload_hash,
    status: job.status as OrderJobStatus,
    orderId: job.order_id,
    errorCode: job.error_code,
    errorMessage: job.error_message,
    attempts: job.attempts,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}

function cleanUpdateInput<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter((entry) => entry[1] !== undefined)) as Partial<T>;
}

function calculateTotal(items: readonly CreateOrderItemInput[]): number {
  return roundMoney(items.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatPedidoNumero(value: number): string {
  return value.toString().padStart(6, '0');
}

function decimalToNumber(value: Prisma.Decimal | DecimalLike | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function toJsonObject(direccion: DireccionEntrega): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(direccion).filter((entry): entry is [string, string | number] => entry[1] !== undefined),
  );
}
