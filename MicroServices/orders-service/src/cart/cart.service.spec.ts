import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ProductCatalogPort, ProductSnapshot } from '../products/product-catalog.port';
import { CartService } from './cart.service';
import type { CartItemRecord, CartRecord, CartRepository } from './cart.repository';

describe('CartService', () => {
  const now = new Date('2026-07-16T10:00:00.000Z');
  const future = new Date('2026-07-16T11:00:00.000Z');
  const cartTtlExpiration = new Date('2026-07-17T10:00:00.000Z');
  const past = new Date('2026-07-16T09:00:00.000Z');
  const clienteId = 'cliente-1';
  const vendedorId = 'vendedor-1';

  const productSnapshot: ProductSnapshot = {
    id: 'product-1',
    vendedorId,
    nombre: 'Agua 20L',
    precioFinal: 1200,
    stock: 20,
    activo: true,
    mostrarPrecio: true,
  };

  let repository: jest.Mocked<CartRepository>;
  let productCatalog: jest.Mocked<ProductCatalogPort>;
  let service: CartService;

  beforeEach(() => {
    repository = {
      findActiveByCliente: jest.fn(),
      findById: jest.fn(),
      findOrCreateActiveCart: jest.fn(),
      incrementItemQuantity: jest.fn(),
      replaceItemQuantity: jest.fn(),
      deleteItem: jest.fn(),
    };
    productCatalog = {
      getSnapshot: jest.fn(),
    };
    service = new CartService(repository, productCatalog, () => now);
  });

  it('returns an active cart with server-calculated totals', async () => {
    repository.findActiveByCliente.mockResolvedValue(cartRecord({
      items: [cartItem({ productoId: 'product-1', cantidad: 2, precioUnitario: 1200 })],
    }));

    await expect(service.getActiveCart(clienteId, vendedorId)).resolves.toEqual({
      id: 'cart-1',
      clienteId,
      vendedorId,
      expiresAt: future.toISOString(),
      items: [
        {
          id: 'item-1',
          productoId: 'product-1',
          nombre: 'Agua 20L',
          cantidad: 2,
          precioUnitario: 1200,
          subtotal: 2400,
        },
      ],
      total: 2400,
    });
  });

  it('uses only JWT cliente identity when reading an active cart', async () => {
    repository.findActiveByCliente.mockResolvedValue(cartRecord({ usuarioId: clienteId }));

    await service.getActiveCart(clienteId, vendedorId);

    expect(repository.findActiveByCliente).toHaveBeenCalledWith(clienteId, vendedorId, now);
    expect(repository.findActiveByCliente).not.toHaveBeenCalledWith('body-user', vendedorId, now);
  });

  it('hides another provider active cart when the cliente switches providers', async () => {
    repository.findActiveByCliente.mockResolvedValue(null);

    await expect(service.getActiveCart(clienteId, 'vendedor-2')).resolves.toBeNull();

    expect(repository.findActiveByCliente).toHaveBeenCalledWith(clienteId, 'vendedor-2', now);
  });

  it('rejects mutations for carts owned by another cliente', async () => {
    repository.findById.mockResolvedValue(cartRecord({ usuarioId: 'cliente-2' }));

    await expect(
      service.updateItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'product-1', cantidad: 3 }),
    ).rejects.toThrow(ForbiddenException);

    expect(repository.replaceItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects mutations for expired carts', async () => {
    repository.findById.mockResolvedValue(cartRecord({ expiresAt: past }));

    await expect(
      service.deleteItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'product-1' }),
    ).rejects.toThrow(ForbiddenException);

    expect(repository.deleteItem).not.toHaveBeenCalled();
  });

  it('returns controlled product unavailable and does not write when catalog is unavailable', async () => {
    productCatalog.getSnapshot.mockRejectedValue(new ServiceUnavailableException('Product catalog is unavailable'));

    await expect(
      service.addItem(clienteId, { vendedorId, productoId: 'product-1', cantidad: 1, userId: 'body-user' }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(repository.findOrCreateActiveCart).not.toHaveBeenCalled();
    expect(repository.incrementItemQuantity).not.toHaveBeenCalled();
  });

  it('creates active carts through the repository invariant instead of a read-then-create service race', async () => {
    productCatalog.getSnapshot.mockResolvedValue(productSnapshot);
    repository.findActiveByCliente.mockResolvedValue(null);
    repository.findOrCreateActiveCart.mockResolvedValue(cartRecord());
    repository.incrementItemQuantity.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 1, precioUnitario: 1200 })],
    }));

    await service.addItem(clienteId, { vendedorId, productoId: 'product-1', cantidad: 1 });

    expect(repository.findOrCreateActiveCart).toHaveBeenCalledWith(clienteId, vendedorId, cartTtlExpiration, now);
    expect(repository.incrementItemQuantity).toHaveBeenCalledWith('cart-1', 'product-1', 'Agua 20L', 1, 1200);
  });

  it('rejects when concurrent active cart creation resolves to another vendor', async () => {
    productCatalog.getSnapshot.mockResolvedValue(productSnapshot);
    repository.findActiveByCliente.mockResolvedValue(null);
    repository.findOrCreateActiveCart.mockResolvedValue(cartRecord({ vendedorId: 'vendedor-2' }));

    await expect(service.addItem(clienteId, { vendedorId, productoId: 'product-1', cantidad: 1 })).rejects.toThrow(
      ForbiddenException,
    );

    expect(repository.incrementItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects explicit add when the product vendor does not match the cart vendor', async () => {
    productCatalog.getSnapshot.mockResolvedValue({ ...productSnapshot, vendedorId: 'vendedor-2' });
    repository.findById.mockResolvedValue(cartRecord({ vendedorId }));

    await expect(
      service.addItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'product-1', cantidad: 1 }),
    ).rejects.toThrow(ForbiddenException);

    expect(repository.incrementItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects update when the product vendor does not match the cart vendor', async () => {
    productCatalog.getSnapshot.mockResolvedValue({ ...productSnapshot, vendedorId: 'vendedor-2' });
    repository.findById.mockResolvedValue(cartRecord({
      vendedorId,
      items: [cartItem({ productoId: 'product-1' })],
    }));

    await expect(
      service.updateItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'product-1', cantidad: 1 }),
    ).rejects.toThrow(ForbiddenException);

    expect(repository.replaceItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects duplicate add when accumulated quantity exceeds available stock', async () => {
    productCatalog.getSnapshot.mockResolvedValue({ ...productSnapshot, stock: 4 });
    repository.findActiveByCliente.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 2, precioUnitario: 1200 })],
    }));

    await expect(service.addItem(clienteId, { vendedorId, productoId: 'product-1', cantidad: 3 })).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(repository.incrementItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects update when requested replacement quantity exceeds available stock', async () => {
    productCatalog.getSnapshot.mockResolvedValue({ ...productSnapshot, stock: 2 });
    repository.findById.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 1, precioUnitario: 1200 })],
    }));

    await expect(
      service.updateItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'product-1', cantidad: 3 }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(repository.replaceItemQuantity).not.toHaveBeenCalled();
  });

  it('increments quantity when adding a duplicate item', async () => {
    productCatalog.getSnapshot.mockResolvedValue(productSnapshot);
    repository.findActiveByCliente.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 2, precioUnitario: 1200 })],
    }));
    repository.incrementItemQuantity.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 5, precioUnitario: 1200 })],
    }));

    const cart = await service.addItem(clienteId, { vendedorId, productoId: 'product-1', cantidad: 3 });

    expect(repository.incrementItemQuantity).toHaveBeenCalledWith('cart-1', 'product-1', 'Agua 20L', 3, 1200);
    expect(cart.items[0]?.cantidad).toBe(5);
    expect(cart.total).toBe(6000);
  });

  it('replaces quantity when updating an item', async () => {
    productCatalog.getSnapshot.mockResolvedValue(productSnapshot);
    repository.findById.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 5, precioUnitario: 1200 })],
    }));
    repository.replaceItemQuantity.mockResolvedValue(cartRecord({
      items: [cartItem({ cantidad: 3, precioUnitario: 1200 })],
    }));

    const cart = await service.updateItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'product-1', cantidad: 3 });

    expect(repository.replaceItemQuantity).toHaveBeenCalledWith('cart-1', 'product-1', 'Agua 20L', 3, 1200);
    expect(cart.items[0]?.cantidad).toBe(3);
    expect(cart.total).toBe(3600);
  });

  it('rejects update when the item does not exist in the cart without product lookup or write', async () => {
    repository.findById.mockResolvedValue(cartRecord({
      items: [cartItem({ productoId: 'existing-product' })],
    }));

    await expect(
      service.updateItem(clienteId, { vendedorId, cartId: 'cart-1', productoId: 'missing-product', cantidad: 3 }),
    ).rejects.toThrow(NotFoundException);

    expect(productCatalog.getSnapshot).not.toHaveBeenCalled();
    expect(repository.replaceItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects a missing cart mutation without writing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.updateItem(clienteId, { vendedorId, cartId: 'missing-cart', productoId: 'product-1', cantidad: 3 }),
    ).rejects.toThrow(NotFoundException);

    expect(repository.replaceItemQuantity).not.toHaveBeenCalled();
  });

  function cartRecord(overrides: Partial<CartRecord> = {}): CartRecord {
    return {
      id: 'cart-1',
      usuarioId: clienteId,
      vendedorId,
      expiresAt: future,
      items: [],
      ...overrides,
    };
  }

  function cartItem(overrides: Partial<CartItemRecord> = {}): CartItemRecord {
    return {
      id: 'item-1',
      productoId: 'product-1',
      nombre: 'Agua 20L',
      cantidad: 1,
      precioUnitario: 1200,
      ...overrides,
    };
  }
});
