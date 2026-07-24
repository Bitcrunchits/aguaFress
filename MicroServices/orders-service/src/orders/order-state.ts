import { ForbiddenException } from '@nestjs/common';
import { OrderEstado } from '@agua/contracts';

const ORDER_TRANSITIONS = {
  [OrderEstado.PENDIENTE]: [OrderEstado.CONFIRMADO, OrderEstado.CANCELADO],
  [OrderEstado.CONFIRMADO]: [OrderEstado.EN_CAMINO, OrderEstado.CANCELADO],
  [OrderEstado.EN_CAMINO]: [OrderEstado.ENTREGADO, OrderEstado.CANCELADO],
  [OrderEstado.ENTREGADO]: [],
  [OrderEstado.CANCELADO]: [],
  [OrderEstado.VENCIDO]: [],
} as const satisfies Record<OrderEstado, readonly OrderEstado[]>;

export function assertOrderTransition(current: OrderEstado, next: OrderEstado): void {
  const allowedTransitions: readonly OrderEstado[] = ORDER_TRANSITIONS[current];
  if (!allowedTransitions.includes(next)) {
    throw new ForbiddenException(`Order cannot transition from ${current} to ${next}`);
  }
}
