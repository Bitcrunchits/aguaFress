import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MetodoPago, OrderEstado, UserRole } from '@agua/contracts';
import type { ProductSnapshot, ScopedProductCatalogPort } from '../products/product-catalog.port';
import type { CartRecord } from '../cart/cart.repository';
import type { OrderRecord, OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import type { ScopedClienteProfileResolverPort } from './cliente-profile-resolver.port';
import type { VendedorProfileResolverPort } from './vendedor-profile-resolver.port';
import type { VendedorProfileNamesResolverPort } from './vendedor-profile-names-resolver.port';

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
    | 'findManyForVendedorCliente'
    | 'updateStatus'
  >>;
  let productCatalog: jest.Mocked<ScopedProductCatalogPort>;
  let vendedorProfileResolver: jest.Mocked<VendedorProfileResolverPort>;
  let clienteProfileResolver: jest.Mocked<ScopedClienteProfileResolverPort>;
  let vendedorProfileNamesResolver: jest.Mocked<VendedorProfileNamesResolverPort>;
  let service: OrdersService;

  beforeEach(() => {
    ordersRepository = {
      createFromCart: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findManyForCliente: jest.fn(),
      findManyForVendedor: jest.fn(),
      findManyForVendedorCliente: jest.fn(),
      updateStatus: jest.fn(),
    };
    productCatalog = {
      getSnapshot: jest.fn(),
      getScopedSnapshot: jest.fn(),
    };
    vendedorProfileResolver = {
      resolveVendedorIdByAuthUserId: jest.fn().mockResolvedValue(vendedorId),
    };
    clienteProfileResolver = {
      resolveNamesByAuthUserIds: jest.fn().mockResolvedValue(new Map()),
      resolveScopedNamesByAuthUserIds: jest.fn().mockResolvedValue(new Map()),
    };
    vendedorProfileNamesResolver = {
      resolveNamesByIds: jest.fn().mockResolvedValue(new Map()),
    };
    service = new OrdersService(
      ordersRepository,
      productCatalog,
      () => createdAt,
      vendedorProfileResolver,
      clienteProfileResolver,
      vendedorProfileNamesResolver,
    );
  });

  it('creates an order from persisted cart item snapshots while product lookup only validates availability', async () => {
    productCatalog.getScopedSnapshot.mockResolvedValue(productSnapshot({ nombre: 'Fresh product name', precioFinal: 9999 }));
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
    expect(productCatalog.getScopedSnapshot).toHaveBeenCalledWith('product-1', clienteUser(), expect.any(Number));
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
    productCatalog.getScopedSnapshot.mockRejectedValue(new ServiceUnavailableException('Product catalog is unavailable'));
    ordersRepository.createFromCart.mockImplementation(async (input) => {
      await input.validateCartItems(cartRecord());
      return orderRecord();
    });

    await expect(service.create(clienteUser(), { vendedorId, metodoPago: MetodoPago.CONTRA_ENTREGA, direccion })).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(productCatalog.getScopedSnapshot).toHaveBeenCalledWith('product-1', clienteUser(), expect.any(Number));
  });

  it.each([
    [new NotFoundException('Product was not found'), NotFoundException],
    [new ServiceUnavailableException('Invalid snapshot'), ServiceUnavailableException],
  ])('does not complete checkout for catalog failure %p', async (failure, exception) => {
    productCatalog.getScopedSnapshot.mockRejectedValue(failure);
    let validated = false;
    ordersRepository.createFromCart.mockImplementation(async (input) => {
      await input.validateCartItems(cartRecord());
      validated = true;
      return orderRecord();
    });
    await expect(service.create(clienteUser(), { vendedorId, metodoPago: MetodoPago.CONTRA_ENTREGA, direccion })).rejects.toThrow(exception);
    expect(validated).toBe(false);
    expect(productCatalog.getScopedSnapshot).toHaveBeenCalledWith('product-1', clienteUser(), expect.any(Number));
  });

  it('does not complete checkout for insufficient stock', async () => {
    productCatalog.getScopedSnapshot.mockResolvedValue(productSnapshot({ stock: 1 }));
    let validated = false;
    ordersRepository.createFromCart.mockImplementation(async (input) => {
      await input.validateCartItems(cartRecord());
      validated = true;
      return orderRecord();
    });
    await expect(service.create(clienteUser(), { vendedorId, metodoPago: MetodoPago.CONTRA_ENTREGA, direccion })).rejects.toThrow(ServiceUnavailableException);
    expect(validated).toBe(false);
  });

  it('allows a cliente to read only their own order', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: clienteId }));

    await expect(service.getById(clienteUser(), 'order-1')).resolves.toMatchObject({ id: 'order-1', clienteId });

    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: 'cliente-2' }));
    await expect(service.getById(clienteUser(), 'order-1')).rejects.toThrow(ForbiddenException);
  });

  it('scopes order lists by caller role', async () => {
    ordersRepository.findManyForCliente.mockResolvedValue({ orders: [orderRecord({ id: 'cliente-order' })], total: 1 });
    ordersRepository.findManyForVendedor.mockResolvedValue({ orders: [orderRecord({ id: 'vendedor-order' })], total: 1 });
    ordersRepository.findMany.mockResolvedValue({ orders: [orderRecord({ id: 'admin-visible-order' })], total: 1 });

    await expect(service.list(clienteUser())).resolves.toEqual({
      data: [expect.objectContaining({ id: 'cliente-order' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    await expect(service.list(vendedorUser())).resolves.toEqual({
      data: [expect.objectContaining({ id: 'vendedor-order' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    await expect(service.list(superAdminUser())).resolves.toEqual({
      data: [expect.objectContaining({ id: 'admin-visible-order' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(ordersRepository.findManyForCliente).toHaveBeenCalledWith(clienteId, 1, 20);
    expect(ordersRepository.findManyForVendedor).toHaveBeenCalledWith(vendedorId, 1, 20);
    expect(vendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith(vendedorId);
    expect(ordersRepository.findMany).toHaveBeenCalledWith(1, 20);
  });

  it('narrows vendedor order list to a single cliente when clienteUserId is provided', async () => {
    ordersRepository.findManyForVendedorCliente.mockResolvedValue({ orders: [orderRecord({ id: 'cliente-scoped-order' })], total: 1 });

    await expect(service.list(vendedorUser(), 1, 20, 'cliente-user-1')).resolves.toEqual({
      data: [expect.objectContaining({ id: 'cliente-scoped-order' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(ordersRepository.findManyForVendedorCliente).toHaveBeenCalledWith(vendedorId, 'cliente-user-1', 1, 20);
  });

  it('lists all vendedor orders without a cliente filter when clienteUserId is absent', async () => {
    ordersRepository.findManyForVendedor.mockResolvedValue({ orders: [orderRecord({ id: 'vendedor-order' })], total: 1 });

    await expect(service.list(vendedorUser())).resolves.toEqual({
      data: [expect.objectContaining({ id: 'vendedor-order' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(ordersRepository.findManyForVendedor).toHaveBeenCalledWith(vendedorId, 1, 20);
  });

  it('resolves vendedor AUTH_USER.id to domain vendedorId before vendedor reads when identities differ', async () => {
    vendedorProfileResolver.resolveVendedorIdByAuthUserId.mockResolvedValue('domain-vendedor-1');
    ordersRepository.findManyForVendedor.mockResolvedValue({ orders: [orderRecord({ id: 'domain-scoped-order', vendedorId: 'domain-vendedor-1' })], total: 1 });
    ordersRepository.findById.mockResolvedValue(orderRecord({ id: 'domain-scoped-order', vendedorId: 'domain-vendedor-1' }));

    await expect(service.list(vendedorUser({ userId: 'auth-user-1' }))).resolves.toEqual({
      data: [expect.objectContaining({ id: 'domain-scoped-order' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    await expect(service.getById(vendedorUser({ userId: 'auth-user-1' }), 'domain-scoped-order')).resolves.toMatchObject({
      id: 'domain-scoped-order',
      vendedorId: 'domain-vendedor-1',
    });

    expect(vendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith('auth-user-1');
    expect(ordersRepository.findManyForVendedor).toHaveBeenCalledWith('domain-vendedor-1', 1, 20);
  });

  it('enriches vendedor order lists with server-resolved cliente names in one batch', async () => {
    ordersRepository.findManyForVendedor.mockResolvedValue({ orders: [orderRecord({ id: 'order-1', usuarioId: clienteId })], total: 1 });
    clienteProfileResolver.resolveScopedNamesByAuthUserIds.mockResolvedValue(new Map([[clienteId, { nombre: 'Juan', apellido: 'Pérez' }]]));

    const result = await service.list(vendedorUser());

    expect(result.data[0]).toMatchObject({ id: 'order-1', clienteNombre: 'Juan', clienteApellido: 'Pérez' });
    expect(clienteProfileResolver.resolveScopedNamesByAuthUserIds).toHaveBeenCalledWith([clienteId], UserRole.VENDEDOR, vendedorId);
  });

  it('deduplicates usuarioIds before resolving names in a single batch', async () => {
    ordersRepository.findManyForVendedor.mockResolvedValue({
      orders: [orderRecord({ id: 'order-1', usuarioId: clienteId }), orderRecord({ id: 'order-2', usuarioId: clienteId })],
      total: 2,
    });
    clienteProfileResolver.resolveScopedNamesByAuthUserIds.mockResolvedValue(new Map([[clienteId, { nombre: 'Juan', apellido: '' }]]));

    await service.list(vendedorUser());

    expect(clienteProfileResolver.resolveScopedNamesByAuthUserIds).toHaveBeenCalledWith([clienteId], UserRole.VENDEDOR, vendedorId);
  });

  it('leaves cliente name fields undefined for a cliente listing their own orders without a resolver call', async () => {
    ordersRepository.findManyForCliente.mockResolvedValue({ orders: [orderRecord({ id: 'order-1' })], total: 1 });

    const result = await service.list(clienteUser());

    expect(result.data[0]).toMatchObject({ id: 'order-1' });
    expect(result.data[0].clienteNombre).toBeUndefined();
    expect(result.data[0].clienteApellido).toBeUndefined();
    expect(clienteProfileResolver.resolveScopedNamesByAuthUserIds).not.toHaveBeenCalled();
  });

  it('restores vendedorId and enriches list items with resolved vendedor names for a cliente read', async () => {
    ordersRepository.findManyForCliente.mockResolvedValue({ orders: [orderRecord({ id: 'order-1' })], total: 1 });
    vendedorProfileNamesResolver.resolveNamesByIds.mockResolvedValue(
      new Map([[vendedorId, { nombre: 'Juan', empresa: 'Acme SA' }]]),
    );

    const result = await service.list(clienteUser());

    expect(result.data[0]).toMatchObject({
      id: 'order-1',
      vendedorId,
      vendedorNombre: 'Juan',
      vendedorEmpresa: 'Acme SA',
    });
    expect(vendedorProfileNamesResolver.resolveNamesByIds).toHaveBeenCalledWith([vendedorId], UserRole.CLIENTE);
  });

  it('deduplicates vendedorIds before resolving vendor names in a single batch', async () => {
    ordersRepository.findManyForVendedor.mockResolvedValue({
      orders: [orderRecord({ id: 'order-1' }), orderRecord({ id: 'order-2' })],
      total: 2,
    });
    vendedorProfileNamesResolver.resolveNamesByIds.mockResolvedValue(new Map());

    await service.list(vendedorUser());

    expect(vendedorProfileNamesResolver.resolveNamesByIds).toHaveBeenCalledWith([vendedorId], UserRole.VENDEDOR);
  });

  it('skips vendor name resolution for an empty page without a resolver call', async () => {
    ordersRepository.findManyForCliente.mockResolvedValue({ orders: [], total: 0 });

    await service.list(clienteUser());

    expect(vendedorProfileNamesResolver.resolveNamesByIds).not.toHaveBeenCalled();
  });

  it('enriches getById with cliente names for super-admin reads', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: clienteId, vendedorId: 'vendedor-2' }));
    clienteProfileResolver.resolveNamesByAuthUserIds.mockResolvedValue(new Map([[clienteId, { nombre: 'Juan', apellido: 'Pérez' }]]));

    await expect(service.getById(superAdminUser(), 'order-1')).resolves.toMatchObject({
      id: 'order-1',
      clienteNombre: 'Juan',
      clienteApellido: 'Pérez',
    });
    expect(clienteProfileResolver.resolveNamesByAuthUserIds).toHaveBeenCalledWith([clienteId], UserRole.SUPER_ADMIN);
    expect(clienteProfileResolver.resolveScopedNamesByAuthUserIds).not.toHaveBeenCalled();
  });

  it('leaves cliente name fields undefined for cliente-owned reads', async () => {
    ordersRepository.findById.mockResolvedValue(orderRecord({ usuarioId: clienteId }));

    const order = await service.getById(clienteUser(), 'order-1');

    expect(order.clienteNombre).toBeUndefined();
    expect(order.clienteApellido).toBeUndefined();
    expect(clienteProfileResolver.resolveScopedNamesByAuthUserIds).not.toHaveBeenCalled();
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
