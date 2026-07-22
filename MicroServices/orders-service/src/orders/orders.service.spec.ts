import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MetodoPago, OrderEstado, UserRole } from '@agua/contracts';
import type { ProductCatalogPort, ProductSnapshot } from '../products/product-catalog.port';
import type { CartRecord } from '../cart/cart.repository';
import type { OrderRecord, OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import type { VendedorProfileResolverPort } from './vendedor-profile-resolver.port';

describe('OrdersService', () => {
  const createdAt = new Date('2026-07-16T10:00:00.000Z');
  const updatedAt = new Date('2026-07-16T10:05:00.000Z');
  const clienteId = 'cliente-1';
  const vendedorId = 'vendedor-1';
  const direccion = { calle: 'San Martin', numero: '123', ciudad: 'Mendoza', provincia: 'Mendoza' };

  let ordersRepository: jest.Mocked<Pick<OrdersRepository,
    | 'createFromCart'
    | 'findById'
    | 'findMany'
    | 'findManyForCliente'
    | 'findManyForVendedor'
    | 'updateStatus'
  >>;
  let productCatalog: jest.Mocked<ProductCatalogPort>;
  let vendedorProfileResolver: jest.Mocked<VendedorProfileResolverPort>;
  let service: OrdersService;

  beforeEach(() => {
    ordersRepository = {
      createFromCart: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findManyForCliente: jest.fn(),
      findManyForVendedor: jest.fn(),
      updateStatus: jest.fn(),
    };
    productCatalog = {
      getSnapshot: jest.fn(),
    };
    vendedorProfileResolver = {
      resolveVendedorIdByAuthUserId: jest.fn().mockResolvedValue(vendedorId),
    };
    service = new OrdersService(ordersRepository, productCatalog, () => createdAt, vendedorProfileResolver);
  });

  it('creates an order from persisted cart item snapshots while product lookup only validates availability', async () => {
    productCatalog.getSnapshot.mockResolvedValue(productSnapshot({ nombre: 'Fresh product name', precioFinal: 9999 }));
    ordersRepository.createFromCart.mockImplementation(async (input) => {
      await input.validateCartItems(cartRecord());
      return orderRecord({
        items: [orderItemRecord({ nombre: 'Cart snapshot name', cantidad: 2, precioUnitario: 1000 })],
      });
    });

    const order = await service.create(clienteUser(), { vendedorId, metodoPago: MetodoPago.CONTRA_ENTREGA, direccion });

    expect(ordersRepository.createFromCart).toHaveBeenCalledWith(expect.objectContaining({
      clienteId,
      vendedorId,
      now: createdAt,
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion,
      observaciones: undefined,
    }));
    expect(productCatalog.getSnapshot).toHaveBeenCalledWith('product-1');
    expect(order).toMatchObject({
      id: 'order-1',
      pedidoNumero: '000001',
      clienteId,
      vendedorId,
      estado: OrderEstado.PENDIENTE,
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      total: 2000,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(order.items).toEqual([{ productId: 'product-1', nombre: 'Cart snapshot name', cantidad: 2, precioUnitario: 1000 }]);
  });

  it('returns controlled unavailable and does not create or clear cart when product refresh fails', async () => {
    productCatalog.getSnapshot.mockRejectedValue(new ServiceUnavailableException('Product catalog is unavailable'));
    ordersRepository.createFromCart.mockImplementation(async (input) => {
      await input.validateCartItems(cartRecord());
      return orderRecord();
    });

    await expect(service.create(clienteUser(), { vendedorId, metodoPago: MetodoPago.CONTRA_ENTREGA, direccion })).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(productCatalog.getSnapshot).toHaveBeenCalledWith('product-1');
  });

  it('allows a cliente to read only their own order', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: clienteId }));

    await expect(service.getById(clienteUser(), 'order-1')).resolves.toMatchObject({ id: 'order-1', clienteId });

    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: 'cliente-2' }));
    await expect(service.getById(clienteUser(), 'order-1')).rejects.toThrow(ForbiddenException);
  });

  it('scopes order lists by caller role', async () => {
    ordersRepository.findManyForCliente.mockResolvedValue([orderRecord({ id: 'cliente-order' })]);
    ordersRepository.findManyForVendedor.mockResolvedValue([orderRecord({ id: 'vendedor-order' })]);
    ordersRepository.findMany.mockResolvedValue([orderRecord({ id: 'admin-visible-order' })]);

    await expect(service.list(clienteUser())).resolves.toEqual([
      expect.objectContaining({ id: 'cliente-order', clienteId }),
    ]);
    await expect(service.list(vendedorUser())).resolves.toEqual([
      expect.objectContaining({ id: 'vendedor-order', vendedorId }),
    ]);
    await expect(service.list(superAdminUser())).resolves.toEqual([
      expect.objectContaining({ id: 'admin-visible-order' }),
    ]);

    expect(ordersRepository.findManyForCliente).toHaveBeenCalledWith(clienteId);
    expect(ordersRepository.findManyForVendedor).toHaveBeenCalledWith(vendedorId);
    expect(vendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith(vendedorId);
    expect(ordersRepository.findMany).toHaveBeenCalledWith();
  });

  it('resolves vendedor AUTH_USER.id to domain vendedorId before vendedor reads when identities differ', async () => {
    vendedorProfileResolver.resolveVendedorIdByAuthUserId.mockResolvedValue('domain-vendedor-1');
    ordersRepository.findManyForVendedor.mockResolvedValue([orderRecord({ id: 'domain-scoped-order', vendedorId: 'domain-vendedor-1' })]);
    ordersRepository.findById.mockResolvedValue(orderRecord({ id: 'domain-scoped-order', vendedorId: 'domain-vendedor-1' }));

    await expect(service.list(vendedorUser({ userId: 'auth-user-1' }))).resolves.toEqual([
      expect.objectContaining({ id: 'domain-scoped-order', vendedorId: 'domain-vendedor-1' }),
    ]);
    await expect(service.getById(vendedorUser({ userId: 'auth-user-1' }), 'domain-scoped-order')).resolves.toMatchObject({
      id: 'domain-scoped-order',
      vendedorId: 'domain-vendedor-1',
    });

    expect(vendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith('auth-user-1');
    expect(ordersRepository.findManyForVendedor).toHaveBeenCalledWith('domain-vendedor-1');
  });

  it('allows super-admin to read any order without lifecycle write access', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: 'cliente-2', vendedorId: 'vendedor-2' }));

    await expect(service.getById(superAdminUser(), 'order-1')).resolves.toMatchObject({ id: 'order-1' });
    await expect(service.updateStatus(superAdminUser(), 'order-1', OrderEstado.CONFIRMADO)).rejects.toThrow(ForbiddenException);
  });

  it('updates allowed states and records transition history through the repository', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE }));
    ordersRepository.updateStatus.mockResolvedValue(orderRecord({ estado: OrderEstado.CONFIRMADO }));

    const order = await service.updateStatus(vendedorUser(), 'order-1', OrderEstado.CONFIRMADO, 'ready');

    expect(ordersRepository.updateStatus).toHaveBeenCalledWith('order-1', OrderEstado.PENDIENTE, OrderEstado.CONFIRMADO, 'ready');
    expect(order.estado).toBe(OrderEstado.CONFIRMADO);
  });

  it('allows a cliente to cancel their own eligible order', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, usuarioId: clienteId }));
    ordersRepository.updateStatus.mockResolvedValue(orderRecord({ estado: OrderEstado.CANCELADO }));

    const order = await service.cancel(clienteUser(), 'order-1', 'Changed delivery plan');

    expect(ordersRepository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderEstado.PENDIENTE,
      OrderEstado.CANCELADO,
      'Changed delivery plan',
    );
    expect(order.estado).toBe(OrderEstado.CANCELADO);
  });

  it('rejects cliente cancellation for another cliente order', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, usuarioId: 'cliente-2' }));

    await expect(service.cancel(clienteUser(), 'order-1', 'Not mine')).rejects.toThrow(ForbiddenException);

    expect(ordersRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects cliente cancellation for their own confirmed order', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.CONFIRMADO, usuarioId: clienteId }));

    await expect(service.cancel(clienteUser(), 'order-1', 'Already confirmed')).rejects.toThrow(ForbiddenException);

    expect(ordersRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects cliente cancellation for their own order already en camino', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.EN_CAMINO, usuarioId: clienteId }));

    await expect(service.cancel(clienteUser(), 'order-1', 'Already on the way')).rejects.toThrow(ForbiddenException);

    expect(ordersRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('keeps vendedor lifecycle updates enforced for vendedor-owned orders only', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, vendedorId }));
    ordersRepository.updateStatus.mockResolvedValue(orderRecord({ estado: OrderEstado.CONFIRMADO }));

    await expect(service.updateStatus(vendedorUser(), 'order-1', OrderEstado.CONFIRMADO)).resolves.toMatchObject({
      estado: OrderEstado.CONFIRMADO,
    });

    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, vendedorId: 'vendedor-2' }));
    await expect(service.updateStatus(vendedorUser(), 'order-1', OrderEstado.CONFIRMADO)).rejects.toThrow(ForbiddenException);
  });

  it('resolves vendedor AUTH_USER.id to domain vendedorId before lifecycle writes when identities differ', async () => {
    vendedorProfileResolver.resolveVendedorIdByAuthUserId.mockResolvedValue('domain-vendedor-1');
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, vendedorId: 'domain-vendedor-1' }));
    ordersRepository.updateStatus.mockResolvedValue(orderRecord({ estado: OrderEstado.CONFIRMADO, vendedorId: 'domain-vendedor-1' }));

    await expect(service.updateStatus(vendedorUser({ userId: 'auth-user-1' }), 'order-1', OrderEstado.CONFIRMADO)).resolves.toMatchObject({
      estado: OrderEstado.CONFIRMADO,
      vendedorId: 'domain-vendedor-1',
    });

    expect(ordersRepository.updateStatus).toHaveBeenCalledWith('order-1', OrderEstado.PENDIENTE, OrderEstado.CONFIRMADO, undefined);
  });

  it('returns a controlled request exception when a concurrent status update sees stale state', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE }));
    ordersRepository.updateStatus.mockRejectedValue(new BadRequestException('Order status changed before update'));

    await expect(service.updateStatus(vendedorUser(), 'order-1', OrderEstado.CONFIRMADO, 'ready')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid state changes and cross-vendor lifecycle writes', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, vendedorId: 'vendedor-2' }));

    await expect(service.updateStatus(vendedorUser(), 'order-1', OrderEstado.CONFIRMADO)).rejects.toThrow(ForbiddenException);
    expect(ordersRepository.updateStatus).not.toHaveBeenCalled();

    ordersRepository.findById.mockResolvedValue(orderRecord({ estado: OrderEstado.PENDIENTE, vendedorId }));
    await expect(service.updateStatus(vendedorUser(), 'order-1', OrderEstado.ENTREGADO)).rejects.toThrow(ForbiddenException);
  });

  function clienteUser() {
    return { userId: clienteId, email: 'cliente@test.com', role: UserRole.CLIENTE };
  }

  function vendedorUser(overrides: Partial<{ userId: string }> = {}) {
    return { userId: overrides.userId ?? vendedorId, email: 'vendedor@test.com', role: UserRole.VENDEDOR };
  }

  function superAdminUser() {
    return { userId: 'admin-1', email: 'admin@test.com', role: UserRole.SUPER_ADMIN };
  }

  function cartRecord(): CartRecord {
    return {
      id: 'cart-1',
      usuarioId: clienteId,
      vendedorId,
      expiresAt: new Date('2026-07-16T11:00:00.000Z'),
      items: [{ id: 'cart-item-1', productoId: 'product-1', nombre: 'Cart snapshot name', cantidad: 2, precioUnitario: 1000 }],
    };
  }

  function productSnapshot(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
    return {
      id: 'product-1',
      vendedorId,
      nombre: 'Agua 20L',
      precioFinal: 1500,
      stock: 10,
      activo: true,
      mostrarPrecio: true,
      ...overrides,
    };
  }

  function orderRecord(overrides: Partial<OrderRecord> = {}): OrderRecord {
    return {
      id: 'order-1',
      pedidoNumero: '000001',
      usuarioId: clienteId,
      vendedorId,
      estado: OrderEstado.PENDIENTE,
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion,
      observaciones: null,
      totalSinIva: 1652.89,
      iva: 347.11,
      total: 2000,
      createdAt,
      updatedAt,
      items: [orderItemRecord()],
      ...overrides,
    };
  }

  function orderItemRecord(overrides: Partial<OrderRecord['items'][number]> = {}): OrderRecord['items'][number] {
    return {
      id: 'order-item-1',
      productoId: 'product-1',
      nombre: 'Cart snapshot name',
      cantidad: 2,
      precioUnitario: 1000,
      ...overrides,
    };
  }
});
