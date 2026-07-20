import { ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { OrderEstado, UserRole } from '@agua/contracts';
import type { CartRecord } from '../cart/cart.repository';
import { CLOCK, type Clock } from '../common/clock.provider';
import { PRODUCT_CATALOG_PORT, type ProductCatalogPort, type ProductSnapshot } from '../products/product-catalog.port';
import type { TcpAuthenticatedUser } from '../tcp/tcp-payload';
import { assertOrderTransition } from './order-state';
import type { OrderRecord, OrdersRepository } from './orders.repository';
import { PrismaOrdersRepository } from './orders.repository';
import type { OrderListResponse, PaginatedResponse } from '@agua/contracts';
import type { CreateOrderRequest, OrderResponse, ParsedOrderListFilters } from './orders.dto';
import { toOrderResponse } from './orders.mapper';

type OrdersServiceRepository = Pick<OrdersRepository,
  | 'createFromCart'
  | 'findById'
  | 'findMany'
  | 'updateStatus'
>;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaOrdersRepository) private readonly ordersRepository: OrdersServiceRepository,
    @Inject(PRODUCT_CATALOG_PORT) private readonly productCatalog: ProductCatalogPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(user: TcpAuthenticatedUser, request: CreateOrderRequest): Promise<OrderResponse> {
    this.assertCliente(user);
    const order = await this.ordersRepository.createFromCart({
      clienteId: user.userId,
      now: this.clock(),
      validateCartItems: (cart) => this.validateCartItems(cart),
      metodoPago: request.metodoPago,
      direccion: request.direccion,
      observaciones: request.observaciones,
    });

    return toOrderResponse(order);
  }

  async getById(user: TcpAuthenticatedUser, orderId: string): Promise<OrderResponse> {
    const order = await this.requireOrder(orderId);
    this.assertCanRead(user, order);
    return toOrderResponse(order);
  }

  async list(user: TcpAuthenticatedUser, filters: ParsedOrderListFilters): Promise<PaginatedResponse<OrderListResponse>> {
    if (user.role === UserRole.CLIENTE) {
      return this.listOrders({ ...filters, clienteId: user.userId, vendedorId: undefined });
    }

    if (user.role === UserRole.VENDEDOR) {
      return this.listOrders({ ...filters, vendedorId: user.userId });
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return this.listOrders(filters);
    }

    throw new ForbiddenException('Role cannot list orders');
  }

  async updateStatus(user: TcpAuthenticatedUser, orderId: string, next: OrderEstado, notes?: string): Promise<OrderResponse> {
    const order = await this.requireOrder(orderId);
    this.assertLifecycleWriter(user, order);
    assertOrderTransition(order.estado, next);
    const updatedOrder = await this.ordersRepository.updateStatus(orderId, order.estado, next, notes);
    return toOrderResponse(updatedOrder);
  }

  cancel(user: TcpAuthenticatedUser, orderId: string, motivo?: string): Promise<OrderResponse> {
    return this.cancelOwnOrder(user, orderId, motivo);
  }

  confirm(user: TcpAuthenticatedUser, orderId: string): Promise<OrderResponse> {
    return this.updateStatus(user, orderId, OrderEstado.CONFIRMADO, 'Order confirmed');
  }

  private async validateCartItems(cart: CartRecord): Promise<void> {
    for (const item of cart.items) {
      const product = await this.productCatalog.getSnapshot(item.productoId);
      this.assertAvailableProduct(product, cart.vendedorId, item.cantidad);
    }
  }

  private async listOrders(filters: ParsedOrderListFilters): Promise<PaginatedResponse<OrderListResponse>> {
    const result = await this.ordersRepository.findMany(filters);

    return {
      data: result.orders.map(toOrderListResponse),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / filters.limit),
      },
    };
  }

  private async requireOrder(orderId: string): Promise<OrderRecord> {
    const order = await this.ordersRepository.findById(orderId);
    if (order === null) {
      throw new NotFoundException('Order was not found');
    }

    return order;
  }

  private assertCanRead(user: TcpAuthenticatedUser, order: OrderRecord): void {
    if (user.role === UserRole.CLIENTE && order.usuarioId === user.userId) {
      return;
    }

    if (user.role === UserRole.VENDEDOR && order.vendedorId === user.userId) {
      return;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    throw new ForbiddenException('Order access denied');
  }

  private async cancelOwnOrder(user: TcpAuthenticatedUser, orderId: string, motivo?: string): Promise<OrderResponse> {
    const order = await this.requireOrder(orderId);
    this.assertClienteOwnsOrder(user, order);
    this.assertClienteCanCancel(order);
    const updatedOrder = await this.ordersRepository.updateStatus(orderId, order.estado, OrderEstado.CANCELADO, motivo);
    return toOrderResponse(updatedOrder);
  }

  private assertClienteCanCancel(order: OrderRecord): void {
    if (order.estado !== OrderEstado.PENDIENTE) {
      throw new ForbiddenException('Cliente can only cancel pending orders');
    }
  }

  private assertClienteOwnsOrder(user: TcpAuthenticatedUser, order: OrderRecord): void {
    if (user.role === UserRole.CLIENTE && order.usuarioId === user.userId) {
      return;
    }

    throw new ForbiddenException('Order cancellation access denied');
  }

  private assertLifecycleWriter(user: TcpAuthenticatedUser, order: OrderRecord): void {
    if (user.role !== UserRole.VENDEDOR || order.vendedorId !== user.userId) {
      throw new ForbiddenException('Order lifecycle access denied');
    }
  }

  private assertCliente(user: TcpAuthenticatedUser): void {
    if (user.role !== UserRole.CLIENTE) {
      throw new ForbiddenException('Only clientes can create orders');
    }
  }

  private assertAvailableProduct(product: ProductSnapshot, vendedorId: string, quantity: number): void {
    if (!product.activo || !product.mostrarPrecio || product.stock < quantity || product.vendedorId !== vendedorId) {
      throw new ServiceUnavailableException('Product is unavailable');
    }
  }
}

function toOrderListResponse(order: OrderRecord): OrderListResponse {
  return {
    id: order.id,
    pedidoNumero: order.pedidoNumero,
    estado: order.estado,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
  };
}
