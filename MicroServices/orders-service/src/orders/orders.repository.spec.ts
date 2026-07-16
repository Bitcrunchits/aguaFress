import { BadRequestException } from '@nestjs/common';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import { PrismaOrdersRepository } from './orders.repository';
import type { PrismaService } from '../common/prisma.service';

describe('PrismaOrdersRepository', () => {
  const clienteId = '11111111-1111-1111-1111-111111111111';
  const vendedorId = '22222222-2222-2222-2222-222222222222';
  const createdAt = new Date('2026-07-16T10:00:00.000Z');
  const direccion = { calle: 'San Martin', numero: '123', ciudad: 'Mendoza', provincia: 'Mendoza' };

  it('re-reads cart in the transaction, increments counter, creates order, history, and deletes cart', async () => {
    const tx = transactionClient(7);
    const repository = new PrismaOrdersRepository(prismaService(tx));

    await repository.createFromCart({
      clienteId,
      now: createdAt,
      validateCartItems: jest.fn().mockResolvedValue(undefined),
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion,
      observaciones: 'Leave at door',
    });

    expect(tx.cart.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { usuario_id: clienteId, active_cart_key: clienteId, expires_at: { gt: createdAt } },
    }));
    expect(tx.orderCounter.upsert).toHaveBeenCalledWith({
      where: { vendedor_id: vendedorId },
      update: { current_value: { increment: 1 } },
      create: { vendedor_id: vendedorId, current_value: 1 },
    });
    expect(tx.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pedido_numero: '000007',
        usuario_id: clienteId,
        vendedor_id: vendedorId,
        estado: OrderEstado.PENDIENTE,
        metodo_pago: MetodoPago.CONTRA_ENTREGA,
        total: 2000,
        items: { create: [{ producto_id: 'product-1', nombre: 'Cart snapshot name', cantidad: 2, precio_unitario: 1000 }] },
        history: { create: [{ estado_anterior: null, estado_nuevo: OrderEstado.PENDIENTE, notas: 'Order created' }] },
      }),
    }));
    expect(tx.cart.delete).toHaveBeenCalledWith({ where: { id: 'cart-1' } });
  });

  it('returns distinct pedido numbers when concurrent transactions receive different counter values', async () => {
    const firstRepository = new PrismaOrdersRepository(prismaService(transactionClient(1)));
    const secondRepository = new PrismaOrdersRepository(prismaService(transactionClient(2)));

    const [firstOrder, secondOrder] = await Promise.all([
      firstRepository.createFromCart(createInput()),
      secondRepository.createFromCart(createInput()),
    ]);

    expect(firstOrder.pedidoNumero).toBe('000001');
    expect(secondOrder.pedidoNumero).toBe('000002');
  });

  it('rejects stale empty carts before writes inside the create-order transaction', async () => {
    const tx = transactionClient(1, prismaCart({ items: [] }));
    const repository = new PrismaOrdersRepository(prismaService(tx));

    await expect(repository.createFromCart(createInput())).rejects.toThrow(BadRequestException);

    expect(tx.orderCounter.upsert).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.cart.delete).not.toHaveBeenCalled();
  });

  it('uses transaction cart snapshots instead of stale preloaded product values', async () => {
    const tx = transactionClient(3, prismaCart({
      items: [{ id: 'cart-item-1', producto_id: 'product-1', nombre: 'Transaction snapshot', cantidad: 4, precio_unitario: 900 }],
    }));
    const repository = new PrismaOrdersRepository(prismaService(tx));

    await repository.createFromCart(createInput());

    expect(tx.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        total: 3600,
        items: { create: [{ producto_id: 'product-1', nombre: 'Transaction snapshot', cantidad: 4, precio_unitario: 900 }] },
      }),
    }));
  });

  it('appends history only after a guarded status update succeeds', async () => {
    const tx = transactionClient(1);
    const repository = new PrismaOrdersRepository(prismaService(tx));

    await repository.updateStatus('order-1', OrderEstado.PENDIENTE, OrderEstado.CONFIRMADO, 'confirmed');

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', estado: OrderEstado.PENDIENTE },
      data: { estado: OrderEstado.CONFIRMADO },
    });
    expect(tx.orderHistory.create).toHaveBeenCalledWith({
      data: { order_id: 'order-1', estado_anterior: OrderEstado.PENDIENTE, estado_nuevo: OrderEstado.CONFIRMADO, notas: 'confirmed' },
    });
    expect(tx.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1' } }));
  });

  it('rejects stale status updates before appending inaccurate history', async () => {
    const tx = transactionClient(1);
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    const repository = new PrismaOrdersRepository(prismaService(tx));

    await expect(repository.updateStatus('order-1', OrderEstado.PENDIENTE, OrderEstado.CONFIRMADO, 'confirmed')).rejects.toThrow(
      BadRequestException,
    );

    expect(tx.orderHistory.create).not.toHaveBeenCalled();
    expect(tx.order.findUnique).not.toHaveBeenCalled();
  });

  it('lists all orders for explicit super-admin scope', async () => {
    const repository = new PrismaOrdersRepository(prismaListService());

    const orders = await repository.findMany();

    expect(orders).toEqual([expect.objectContaining({ id: 'order-1' })]);
  });

  it('throws controlled request exception when updated order disappears after guarded update', async () => {
    const tx = transactionClient(1);
    tx.order.findUnique.mockResolvedValue(null);
    const repository = new PrismaOrdersRepository(prismaService(tx));

    await expect(repository.updateStatus('order-1', OrderEstado.PENDIENTE, OrderEstado.CONFIRMADO)).rejects.toThrow(
      BadRequestException,
    );
  });

  function createInput(now: Date = createdAt) {
    return {
      clienteId,
      now,
      validateCartItems: jest.fn().mockResolvedValue(undefined),
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion,
      observaciones: undefined,
    };
  }

  function prismaService(tx: TransactionClientMock): PrismaService {
    return {
      $transaction: jest.fn(async (callback: (client: TransactionClientMock) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
  }

  function prismaListService(): PrismaService {
    return {
      order: {
        findMany: jest.fn().mockResolvedValue([prismaOrder({})]),
      },
    } as unknown as PrismaService;
  }

  function transactionClient(counterValue: number, activeCart: PrismaCartMock | null = prismaCart()): TransactionClientMock {
    return {
      orderCounter: {
        upsert: jest.fn().mockResolvedValue({ vendedor_id: vendedorId, current_value: counterValue }),
      },
      order: {
        create: jest.fn().mockResolvedValue(prismaOrder({ pedido_numero: counterValue.toString().padStart(6, '0') })),
        findUnique: jest.fn().mockResolvedValue(prismaOrder({})),
        findMany: jest.fn().mockResolvedValue([prismaOrder({})]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderHistory: {
        create: jest.fn().mockResolvedValue({ id: 'history-1' }),
      },
      cart: {
        findFirst: jest.fn().mockResolvedValue(activeCart),
        delete: jest.fn().mockResolvedValue(prismaCart()),
      },
    };
  }

  function prismaCart(overrides: Partial<PrismaCartMock> = {}): PrismaCartMock {
    return {
      id: 'cart-1',
      usuario_id: clienteId,
      vendedor_id: vendedorId,
      expires_at: new Date('2026-07-16T11:00:00.000Z'),
      items: [{ id: 'cart-item-1', producto_id: 'product-1', nombre: 'Cart snapshot name', cantidad: 2, precio_unitario: 1000 }],
      ...overrides,
    };
  }

  function prismaOrder(overrides: Partial<PrismaOrderMock>): PrismaOrderMock {
    return {
      id: 'order-1',
      pedido_numero: '000001',
      usuario_id: clienteId,
      vendedor_id: vendedorId,
      direccion_entrega: direccion,
      estado: OrderEstado.PENDIENTE,
      metodo_pago: MetodoPago.CONTRA_ENTREGA,
      total_sin_iva: 1652.89,
      iva: 347.11,
      total: 2000,
      observaciones: null,
      created_at: createdAt,
      updated_at: createdAt,
      items: [{ id: 'order-item-1', producto_id: 'product-1', nombre: 'Cart snapshot name', cantidad: 2, precio_unitario: 1000 }],
      ...overrides,
    };
  }
});

interface TransactionClientMock {
  readonly orderCounter: { readonly upsert: jest.Mock };
  readonly order: {
    readonly create: jest.Mock;
    readonly findUnique: jest.Mock;
    readonly findMany: jest.Mock;
    readonly updateMany: jest.Mock;
  };
  readonly orderHistory: { readonly create: jest.Mock };
  readonly cart: { readonly findFirst: jest.Mock; readonly delete: jest.Mock };
}

interface PrismaOrderItemMock {
  readonly id: string;
  readonly producto_id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precio_unitario: number;
}

interface PrismaOrderMock {
  readonly id: string;
  readonly pedido_numero: string;
  readonly usuario_id: string;
  readonly vendedor_id: string;
  readonly direccion_entrega: unknown;
  readonly estado: OrderEstado;
  readonly metodo_pago: MetodoPago;
  readonly total_sin_iva: number;
  readonly iva: number;
  readonly total: number;
  readonly observaciones: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly items: readonly PrismaOrderItemMock[];
}

interface PrismaCartItemMock {
  readonly id: string;
  readonly producto_id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precio_unitario: number;
}

interface PrismaCartMock {
  readonly id: string;
  readonly usuario_id: string;
  readonly vendedor_id: string;
  readonly expires_at: Date;
  readonly items: readonly PrismaCartItemMock[];
}
