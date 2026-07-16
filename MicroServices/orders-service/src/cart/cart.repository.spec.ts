import { PrismaCartRepository } from './cart.repository';
import type { PrismaService } from '../common/prisma.service';

describe('PrismaCartRepository', () => {
  const now = new Date('2026-07-16T10:00:00.000Z');
  const expiresAt = new Date('2026-07-16T11:00:00.000Z');
  const clienteId = '11111111-1111-1111-1111-111111111111';
  const vendedorId = '22222222-2222-2222-2222-222222222222';

  it('creates active carts with a unique active cart key for the cliente', async () => {
    const tx = transactionClient({
      activeCart: null,
      createdCart: prismaCart({ id: '33333333-3333-3333-3333-333333333333' }),
    });
    const repository = new PrismaCartRepository(prismaService(tx));

    await repository.findOrCreateActiveCart(clienteId, vendedorId, expiresAt, now);

    expect(tx.cart.updateMany).toHaveBeenCalledWith({
      where: {
        usuario_id: clienteId,
        active_cart_key: clienteId,
        expires_at: { lte: now },
      },
      data: { active_cart_key: null },
    });
    expect(tx.cart.create).toHaveBeenCalledWith({
      data: {
        usuario_id: clienteId,
        vendedor_id: vendedorId,
        expires_at: expiresAt,
        active_cart_key: clienteId,
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
        active_cart_key: clienteId,
        expires_at: { gt: now },
      },
      include: { items: true },
      orderBy: { updated_at: 'desc' },
    });
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
});

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

interface PrismaCartMock {
  readonly id: string;
  readonly usuario_id: string;
  readonly vendedor_id: string;
  readonly expires_at: Date;
  readonly items: readonly [];
}
