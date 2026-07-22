import { ForbiddenException } from '@nestjs/common';
import { OrderEstado } from '@agua/contracts';
import { assertOrderTransition } from './order-state';

describe('order state machine', () => {
  it('allows pending orders to move to confirmed and then en camino', () => {
    expect(() => assertOrderTransition(OrderEstado.PENDIENTE, OrderEstado.CONFIRMADO)).not.toThrow();
    expect(() => assertOrderTransition(OrderEstado.CONFIRMADO, OrderEstado.EN_CAMINO)).not.toThrow();
  });

  it('rejects invalid lifecycle transitions', () => {
    expect(() => assertOrderTransition(OrderEstado.PENDIENTE, OrderEstado.ENTREGADO)).toThrow(ForbiddenException);
    expect(() => assertOrderTransition(OrderEstado.CANCELADO, OrderEstado.CONFIRMADO)).toThrow(ForbiddenException);
  });
});
