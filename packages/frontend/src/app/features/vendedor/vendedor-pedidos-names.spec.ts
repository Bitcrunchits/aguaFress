import { MetodoPago, OrderEstado, type OrderResponse, type VendedorClienteItemV2 } from '@agua/contracts';
import {
  CLIENTE_FALLBACK,
  buildClienteLookup,
  formatClienteNombre,
  resolveClienteNombre,
} from './vendedor-pedidos-names';

function order(clienteId: string): OrderResponse {
  return {
    id: 'order-1',
    pedidoNumero: 'P-0001',
    clienteId,
    vendedorId: 'vendedor-1',
    items: [],
    totalSinIva: 0,
    iva: 0,
    total: 0,
    estado: OrderEstado.PENDIENTE,
    metodoPago: MetodoPago.CONTRA_ENTREGA,
    direccion: { calle: 'Av. Corrientes', numero: '1234' },
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  };
}

function item(clienteUserId: string, nombre: string, apellido?: string): VendedorClienteItemV2 {
  return { id: `cliente-${clienteUserId}`, nombre, apellido, clienteUserId };
}

describe('vendedor-pedidos-names', () => {
  it('builds a lookup keyed by clienteUserId', () => {
    const lookup = buildClienteLookup([
      item('auth-1', 'María', 'López'),
      item('auth-2', 'Juan'),
    ]);

    expect(lookup.get('auth-1')?.nombre).toBe('María');
    expect(lookup.get('auth-2')?.apellido).toBeUndefined();
    expect(lookup.get('missing')).toBeUndefined();
  });

  it('formats nombre + apellido (or just nombre)', () => {
    expect(formatClienteNombre(item('a', 'María', 'López'))).toBe('María López');
    expect(formatClienteNombre(item('a', 'Juan'))).toBe('Juan');
  });

  it('resolves the cliente name by order.clienteId', () => {
    const lookup = buildClienteLookup([item('auth-1', 'María', 'López')]);

    expect(resolveClienteNombre(order('auth-1'), lookup)).toBe('María López');
  });

  it('returns the fallback when the lookup has no match', () => {
    const lookup = buildClienteLookup([item('auth-1', 'María', 'López')]);

    expect(resolveClienteNombre(order('auth-999'), lookup)).toBe(CLIENTE_FALLBACK);
  });
});
