import { NotFoundException } from '@nestjs/common';
import { PrismaCartRepository } from './cart.repository';
import type { PrismaService } from '../common/prisma.service';

describe('PrismaCartRepository', () => {
  const now = new Date('2026-07-16T10:00:00.000Z');
  const expiresAt = new Date('2026-07-16T11:00:00.000Z');
  const clienteId = '11111111-1111-1111-1111-111111111111';
  const vendedorId = '22222222-2222-2222-2222-222222222222';

  it('creates active carts with a unique active cart key for the cliente and provider', async () => {
    const tx = transactionClient({
      activeCart: null,
      createdCart: prismaCart({ id: '33333333-3333-3333-3333-333333333333' }),
    });
    const repository = new PrismaCartRepository(prismaService(tx));

    await repository.findOrCreateActiveCart(clienteId, vendedorId, expiresAt, now);

    expect(tx.cart.updateMany).toHaveBeenCalledWith({
      where: {
        usuario_id: clienteId,
        active_cart_key: `${clienteId}:${vendedorId}`,
        expires_at: { lte: now },
      },
      data: { active_cart_key: null },
    });
    expect(tx.cart.create).toHaveBeenCalledWith({
      data: {
        usuario_id: clienteId,
        vendedor_id: vendedorId,
        expires_at: expiresAt,
        active_cart_key: `${clienteId}:${vendedorId}`,
      },
      include: { items: true },
    });
  });

  it('reuses the active cart found inside the transaction instead of creating another one', async () => {
    const activeCart = prismaCart({ id: '44444444-4444-4444-4444-444444444444' });
    const tx = transactionClient({ activeCart, createdCart: prismaCart({}) });
    const repository = new PrismaCartRepository(prismaService(tx));

    const cart = await repository.findOrCreateActiveCart(clienteId, vendedorId, expiresAt, now);

    expect(cart.id).toBe(activeCart.id);
    expect(tx.cart.create).not.toHaveBeenCalled();
  });

  it('falls back to the active cart when concurrent creation hits the unique active cart key', async () => {
    const activeCart = prismaCart({ id: '55555555-5555-5555-5555-555555555555' });
    const prisma = prismaServiceWithUniqueConflict(activeCart);
    const repository = new PrismaCartRepository(prisma);

    const cart = await repository.findOrCreateActiveCart(clienteId, vendedorId, expiresAt, now);

    expect(cart.id).toBe(activeCart.id);
    expect(prisma.cart.findFirst).toHaveBeenCalledWith({
      where: {
        usuario_id: clienteId,
        vendedor_id: vendedorId,
        active_cart_key: `${clienteId}:${vendedorId}`,
        expires_at: { gt: now },
      },
      include: { items: true },
      orderBy: { updated_at: 'desc' },
    });
  });

  it('finds active carts only within the selected provider scope', async () => {
    const prisma = rootPrismaService({ updatedCount: 1, cart: prismaCart({}) });
    const repository = new PrismaCartRepository(prisma);

    await repository.findActiveByCliente(clienteId, vendedorId, now);

    expect(prisma.cart.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        usuario_id: clienteId,
        vendedor_id: vendedorId,
        active_cart_key: `${clienteId}:${vendedorId}`,
        expires_at: { gt: now },
      },
    }));
  });

  it('replaces an existing item quantity without creating a missing item', async () => {
    const prisma = rootPrismaService({
      updatedCount: 1,
      cart: prismaCart({
        items: [prismaCartItem({ producto_id: 'product-1', cantidad: 3 })],
      }),
    });
    const repository = new PrismaCartRepository(prisma);

    const cart = await repository.replaceItemQuantity('cart-1', 'product-1', 'Agua 20L', 3, 1200);

    expect(prisma.cartItem.updateMany).toHaveBeenCalledWith({
      where: {
        cart_id: 'cart-1',
        producto_id: 'product-1',
      },
      data: {
        nombre: 'Agua 20L',
        cantidad: 3,
        precio_unitario: 1200,
      },
    });
    expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    expect(cart.items[0]?.cantidad).toBe(3);
  });

  it('rejects replace quantity when the cart item does not exist', async () => {
    const prisma = rootPrismaService({ updatedCount: 0, cart: prismaCart({}) });
    const repository = new PrismaCartRepository(prisma);

    await expect(repository.replaceItemQuantity('cart-1', 'missing-product', 'Agua 20L', 3, 1200)).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.cart.findUnique).not.toHaveBeenCalled();
  });

  function prismaService(tx: TransactionClientMock): PrismaService {
    return {
      $transaction: jest.fn(async (callback: (client: TransactionClientMock) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
  }

  function prismaServiceWithUniqueConflict(activeCart: PrismaCartMock): PrismaService & RootPrismaMock {
    return {
      $transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      cart: {
        findFirst: jest.fn().mockResolvedValue(activeCart),
      },
    } as unknown as PrismaService & RootPrismaMock;
  }

  function rootPrismaService(options: RootPrismaOptions): PrismaService & RootPrismaMutationMock {
    return {
      cartItem: {
        updateMany: jest.fn().mockResolvedValue({ count: options.updatedCount }),
        upsert: jest.fn(),
      },
      cart: {
        findFirst: jest.fn().mockResolvedValue(options.cart),
        findUnique: jest.fn().mockResolvedValue(options.cart),
      },
    } as unknown as PrismaService & RootPrismaMutationMock;
  }

  function transactionClient(options: TransactionClientOptions): TransactionClientMock {
    return {
      cart: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(options.activeCart),
        findUnique: jest.fn().mockResolvedValue(options.activeCart ?? options.createdCart),
        create: jest.fn().mockResolvedValue(options.createdCart),
      },
    };
  }

  function prismaCart(overrides: Partial<PrismaCartMock>): PrismaCartMock {
    return {
      id: '33333333-3333-3333-3333-333333333333',
      usuario_id: clienteId,
      vendedor_id: vendedorId,
      expires_at: expiresAt,
      items: [],
      ...overrides,
    };
  }

  function prismaCartItem(overrides: Partial<PrismaCartItemMock>): PrismaCartItemMock {
    return {
      id: 'item-1',
      producto_id: 'product-1',
      nombre: 'Agua 20L',
      cantidad: 1,
      precio_unitario: { toNumber: () => 1200 },
      ...overrides,
    };
  }
});

interface RootPrismaOptions {
  readonly updatedCount: number;
  readonly cart: PrismaCartMock;
}

interface TransactionClientOptions {
  readonly activeCart: PrismaCartMock | null;
  readonly createdCart: PrismaCartMock;
}

interface TransactionClientMock {
  readonly cart: CartDelegateMock;
}

interface CartDelegateMock {
  readonly updateMany: jest.Mock;
  readonly findFirst: jest.Mock;
  readonly findUnique: jest.Mock;
  readonly create: jest.Mock;
}

interface RootPrismaMock {
  readonly cart: Pick<CartDelegateMock, 'findFirst'>;
}

interface RootPrismaMutationMock {
  readonly cart: Pick<CartDelegateMock, 'findFirst' | 'findUnique'>;
  readonly cartItem: CartItemDelegateMock;
}

interface CartItemDelegateMock {
  readonly updateMany: jest.Mock;
  readonly upsert: jest.Mock;
}

interface DecimalLikeMock {
  toNumber(): number;
}

interface PrismaCartItemMock {
  readonly id: string;
  readonly producto_id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precio_unitario: DecimalLikeMock;
}

interface PrismaCartMock {
  readonly id: string;
  readonly usuario_id: string;
  readonly vendedor_id: string;
  readonly expires_at: Date;
  readonly items: readonly PrismaCartItemMock[];
}
