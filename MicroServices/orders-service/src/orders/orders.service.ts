import { ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { OrderEstado, UserRole, type OrderListResponse, type PaginatedResponse } from '@agua/contracts';
import type { CartRecord } from '../cart/cart.repository';
import { CLOCK, type Clock } from '../common/clock.provider';
import { PRODUCT_CATALOG_TIMEOUT_MS, SCOPED_PRODUCT_CATALOG_PORT, type ProductSnapshot, type ScopedProductCatalogPort } from '../products/product-catalog.port';
import type { TcpAuthenticatedUser } from '../tcp/tcp-payload';
import { assertOrderTransition } from './order-state';
import { CLIENTE_PROFILE_RESOLVER_PORT, type ClienteProfileResolverPort } from './cliente-profile-resolver.port';
import { DEFAULT_LIMIT, MAX_LIMIT, PrismaOrdersRepository, type OrderRecord, type OrdersRepository } from './orders.repository';
import type { CreateOrderRequest, OrderResponse, OrderResponseV2 } from './orders.dto';
import { toOrderListResponse, toOrderResponse } from './orders.mapper';
import { VENDEDOR_PROFILE_RESOLVER_PORT, type VendedorProfileResolverPort } from './vendedor-profile-resolver.port';

type OrdersServiceRepository = Pick<OrdersRepository,
  | 'createFromCart'
  | 'findById'
  | 'findMany'
  | 'findManyForCliente'
  | 'findManyForVendedor'
  | 'findManyForVendedorCliente'
  | 'updateStatus'
>;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaOrdersRepository) private readonly ordersRepository: OrdersServiceRepository,
    @Inject(SCOPED_PRODUCT_CATALOG_PORT) private readonly productCatalog: ScopedProductCatalogPort,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT) private readonly vendedorProfileResolver: VendedorProfileResolverPort,
    @Inject(CLIENTE_PROFILE_RESOLVER_PORT) private readonly clienteProfileResolver: ClienteProfileResolverPort,
  ) {}

  async create(user: TcpAuthenticatedUser, request: CreateOrderRequest): Promise<OrderResponse> {
    this.assertCliente(user);
    const clienteUserId = user.userId;
    const catalogDeadline = Date.now() + PRODUCT_CATALOG_TIMEOUT_MS;
    const order = await this.ordersRepository.createFromCart({
      // Legacy repository input name: clienteId stores AUTH_USER.id, not CLIENTE.id.
      clienteId: clienteUserId,
      vendedorId: request.vendedorId,
      now: this.clock(),
      validateCartItems: (cart) => this.validateCartItems(cart, user, catalogDeadline),
      metodoPago: request.metodoPago,
      direccion: request.direccion,
      observaciones: request.observaciones,
    });

    return toOrderResponse(order);
  }

  async getById(user: TcpAuthenticatedUser, orderId: string): Promise<OrderResponseV2> {
    const order = await this.requireOrder(orderId);
    await this.assertCanRead(user, order);
    return this.toOrderResponseWithName(order, user.role);
  }

  async list(
    user: TcpAuthenticatedUser,
    page = 1,
    limit = DEFAULT_LIMIT,
    clienteUserId?: string,
  ): Promise<PaginatedResponse<OrderListResponse>> {
    const safePage = normalizePage(page);
    const safeLimit = clampLimit(limit);

    let orders: readonly OrderRecord[];
    let total: number;

    if (user.role === UserRole.CLIENTE) {
      // clienteUserId filter is vendedor-only: a cliente always lists their own orders.
      const result = await this.ordersRepository.findManyForCliente(user.userId, safePage, safeLimit);
      orders = result.orders;
      total = result.total;
    } else if (user.role === UserRole.VENDEDOR) {
      const vendedorId = await this.resolveDomainVendedorId(user);
      const result = clienteUserId === undefined
        ? await this.ordersRepository.findManyForVendedor(vendedorId, safePage, safeLimit)
        : await this.ordersRepository.findManyForVendedorCliente(vendedorId, clienteUserId, safePage, safeLimit);
      orders = result.orders;
      total = result.total;
    } else if (user.role === UserRole.SUPER_ADMIN) {
      // clienteUserId filter is vendedor-only: super-admin always lists all orders.
      const result = await this.ordersRepository.findMany(safePage, safeLimit);
      orders = result.orders;
      total = result.total;
    } else {
      throw new ForbiddenException('Role cannot list orders');
    }

    const names = await this.resolveClienteNames(orders, user.role);

    return {
      data: orders.map((order) => toOrderListResponse(order, names.get(order.usuarioId)?.nombre, names.get(order.usuarioId)?.apellido)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    };
  }

  async updateStatus(user: TcpAuthenticatedUser, orderId: string, next: OrderEstado, notes?: string): Promise<OrderResponse> {
    const order = await this.requireOrder(orderId);
    await this.assertLifecycleWriter(user, order);
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

  private async validateCartItems(cart: CartRecord, user: TcpAuthenticatedUser, deadline: number): Promise<void> {
    for (const item of cart.items) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new ServiceUnavailableException('Product catalog validation timed out');
      const product = await this.productCatalog.getScopedSnapshot(item.productoId, user, remaining);
      this.assertAvailableProduct(product, cart.vendedorId, item.cantidad);
    }
    if (Date.now() >= deadline) throw new ServiceUnavailableException('Product catalog validation timed out');
  }

  private async requireOrder(orderId: string): Promise<OrderRecord> {
    const order = await this.ordersRepository.findById(orderId);
    if (order === null) {
      throw new NotFoundException('Order was not found');
    }

    return order;
  }

  private async toOrderResponseWithName(order: OrderRecord, role: UserRole): Promise<OrderResponseV2> {
    if (role === UserRole.CLIENTE) {
      return toOrderResponse(order);
    }

    const names = await this.clienteProfileResolver.resolveNamesByAuthUserIds([order.usuarioId], role);
    const name = names.get(order.usuarioId);
    return {
      ...toOrderResponse(order),
      clienteNombre: name?.nombre,
      clienteApellido: name?.apellido,
    };
  }

  private resolveClienteNames(
    orders: readonly OrderRecord[],
    role: UserRole,
  ): Promise<ReadonlyMap<string, { nombre: string; apellido?: string }>> {
    if (orders.length === 0 || role === UserRole.CLIENTE) {
      return Promise.resolve(new Map());
    }

    const distinctUserIds = [...new Set(orders.map((order) => order.usuarioId))];
    return this.clienteProfileResolver.resolveNamesByAuthUserIds(distinctUserIds, role);
  }

  private async assertCanRead(user: TcpAuthenticatedUser, order: OrderRecord): Promise<void> {
    if (user.role === UserRole.CLIENTE && order.usuarioId === user.userId) {
      return;
    }

    if (await this.isVendedorDomainMatch(user, order)) {
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

  private async assertLifecycleWriter(user: TcpAuthenticatedUser, order: OrderRecord): Promise<void> {
    if (!await this.isVendedorDomainMatch(user, order)) {
      throw new ForbiddenException('Order lifecycle access denied');
    }
  }

  private async isVendedorDomainMatch(user: TcpAuthenticatedUser, order: OrderRecord): Promise<boolean> {
    if (user.role !== UserRole.VENDEDOR) {
      return false;
    }

    const vendedorId = await this.resolveDomainVendedorId(user);
    return order.vendedorId === vendedorId;
  }

  private resolveDomainVendedorId(user: TcpAuthenticatedUser): Promise<string> {
    return this.vendedorProfileResolver.resolveVendedorIdByAuthUserId(user.userId);
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

function normalizePage(page: number): number {
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

function clampLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}
