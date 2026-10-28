import { MetodoPago, OrderEstado } from '@agua/contracts';

/**
 * Canonical ISO 8601 shape accepted by the cliente orders screens. A date-only
 * value is valid; a date-time value must carry minutes and may carry seconds,
 * fractional seconds, and an explicit UTC offset.
 */
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export const ORDER_ESTADO_LABELS: Record<OrderEstado, string> = {
  [OrderEstado.PENDIENTE]: 'Pendiente',
  [OrderEstado.CONFIRMADO]: 'Confirmado',
  [OrderEstado.EN_CAMINO]: 'En camino',
  [OrderEstado.ENTREGADO]: 'Entregado',
  [OrderEstado.CANCELADO]: 'Cancelado',
  [OrderEstado.VENCIDO]: 'Vencido',
};

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  [MetodoPago.CONTRA_ENTREGA]: 'Contra entrega',
};

/**
 * Returns the canonical `YYYY-MM-DD` value for a valid ISO 8601 input, or
 * `null` when the input is not a real calendar date. The round trip rejects
 * values like `2026-02-30` that `Date` would otherwise roll over.
 */
export function isoDateOf(value: string): string | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const dateOnly = value.slice(0, 10);
  const dateAtMidnight = new Date(`${dateOnly}T00:00:00.000Z`);
  if (
    Number.isNaN(dateAtMidnight.getTime()) ||
    dateAtMidnight.toISOString().slice(0, 10) !== dateOnly
  ) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatIsoDate(value: string): string {
  return isoDateOf(value) ?? '—';
}
