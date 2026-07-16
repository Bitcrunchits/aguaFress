import { Test } from '@nestjs/testing';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { UserRole } from '@agua/contracts';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { CartResponse } from './cart.dto';
import type { TcpPayload } from '../tcp/tcp-payload';

describe('CartController', () => {
  const cartResponse: CartResponse = {
    id: 'cart-1',
    clienteId: 'jwt-user',
    vendedorId: 'vendedor-1',
    expiresAt: '2026-07-16T11:00:00.000Z',
    items: [],
    total: 0,
  };

  let service: jest.Mocked<Pick<CartService, 'getActiveCart' | 'addItem' | 'updateItem' | 'deleteItem'>>;
  let controller: CartController;

  beforeEach(async () => {
    service = {
      getActiveCart: jest.fn().mockResolvedValue(cartResponse),
      addItem: jest.fn().mockResolvedValue(cartResponse),
      updateItem: jest.fn().mockResolvedValue(cartResponse),
      deleteItem: jest.fn().mockResolvedValue(cartResponse),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        TcpPayloadAdapter,
        { provide: CartService, useValue: service },
      ],
    }).compile();

    controller = moduleRef.get(CartController);
  });

  it('handles cart.get using JWT identity and ignores body userId', async () => {
    const payload = authenticatedPayload({ body: { userId: 'body-user' } });

    await expect(controller.getCart(payload)).resolves.toBe(cartResponse);

    expect(service.getActiveCart).toHaveBeenCalledWith('jwt-user');
    expect(service.getActiveCart).not.toHaveBeenCalledWith('body-user');
  });

  it('handles cart.items_add with body DTO and JWT identity', async () => {
    const payload = authenticatedPayload({ body: { productoId: 'product-1', cantidad: 2 } });

    await expect(controller.addItem(payload)).resolves.toBe(cartResponse);

    expect(service.addItem).toHaveBeenCalledWith('jwt-user', { productoId: 'product-1', cantidad: 2 });
  });

  it('handles cart.items_update with body DTO and JWT identity', async () => {
    const payload = authenticatedPayload({ body: { cartId: 'cart-1', productoId: 'product-1', cantidad: 3 } });

    await expect(controller.updateItem(payload)).resolves.toBe(cartResponse);

    expect(service.updateItem).toHaveBeenCalledWith('jwt-user', {
      cartId: 'cart-1',
      productoId: 'product-1',
      cantidad: 3,
    });
  });

  it('handles cart.items_delete with body DTO and JWT identity', async () => {
    const payload = authenticatedPayload({ body: { cartId: 'cart-1', productoId: 'product-1' } });

    await expect(controller.deleteItem(payload)).resolves.toBe(cartResponse);

    expect(service.deleteItem).toHaveBeenCalledWith('jwt-user', { cartId: 'cart-1', productoId: 'product-1' });
  });

  it('exposes the required TCP message patterns', () => {
    expect(messagePatternFor('getCart')).toBe('cart.get');
    expect(messagePatternFor('addItem')).toBe('cart.items_add');
    expect(messagePatternFor('updateItem')).toBe('cart.items_update');
    expect(messagePatternFor('deleteItem')).toBe('cart.items_delete');
  });

  function messagePatternFor(methodName: keyof CartController): string {
    const method = CartController.prototype[methodName];
    const pattern = Reflect.getMetadata(PATTERN_METADATA, method) as readonly string[] | undefined;
    const [firstPattern] = pattern ?? [];
    if (firstPattern === undefined) {
      throw new Error(`Missing TCP pattern for ${String(methodName)}`);
    }

    return firstPattern;
  }

  function authenticatedPayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
    return {
      user: {
        sub: 'jwt-user',
        email: 'jwt-user@test.com',
        role: UserRole.CLIENTE,
      },
      ...overrides,
    };
  }
});
