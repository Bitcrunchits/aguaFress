import { BadRequestException } from '@nestjs/common';
import {
  parseAddCartItemRequest,
  parseDeleteCartItemRequest,
  parseGetCartRequest,
  parseUpdateCartItemRequest,
} from './cart.dto';

describe('cart request parsers', () => {
  const add = { vendedorId: 'seller-1', productoId: 'product-1', cantidad: 2 };
  const update = { ...add, cartId: 'cart-1' };
  const remove = { vendedorId: 'seller-1', cartId: 'cart-1', productoId: 'product-1' };
  const get = { vendedorId: 'seller-1' };

  it('accepts add fields including optional cartId', () => {
    expect(parseAddCartItemRequest(add)).toMatchObject(add);
    expect(parseAddCartItemRequest(update)).toMatchObject(update);
  });

  it('accepts update fields', () => {
    expect(parseUpdateCartItemRequest(update)).toEqual(update);
  });

  it('accepts delete fields', () => {
    expect(parseDeleteCartItemRequest(remove)).toEqual(remove);
  });

  it('accepts get fields', () => {
    expect(parseGetCartRequest(get)).toEqual(get);
  });

  it.each([
    ['add', parseAddCartItemRequest, add],
    ['update', parseUpdateCartItemRequest, update],
    ['delete', parseDeleteCartItemRequest, remove],
    ['get', parseGetCartRequest, get],
  ])('rejects client userId and other extra fields for %s', (_name, parse, validRequest) => {
    expect(() => parse({ ...validRequest, userId: 'attacker' })).toThrow(BadRequestException);
    expect(() => parse({ ...validRequest, unexpected: true })).toThrow('property unexpected should not exist');
  });
});
