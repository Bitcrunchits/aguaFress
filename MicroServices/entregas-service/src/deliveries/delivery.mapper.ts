import { DeliveryEstado, type DeliveryResponse } from '@agua/contracts';
import { $Enums } from '../generated/prisma';
import type { DeliveryRecord } from './deliveries.repository';

export function toDeliveryResponse(record: DeliveryRecord): DeliveryResponse {
  return {
    id: record.id,
    orderId: record.orderId,
    vendedorId: record.vendedorId,
    estado: toContractDeliveryEstado(record.estado),
    cliente: {
      nombre: record.clienteNombre,
      telefono: record.clienteTelefono ?? undefined,
    },
    direccion: {
      calle: record.direccionCalle,
      numero: record.direccionNumero,
      pisoDepto: record.direccionPiso ?? undefined,
      referencia: record.direccionReferencia ?? undefined,
      barrio: record.direccionBarrio ?? undefined,
      ciudad: record.direccionCiudad ?? undefined,
      provincia: record.direccionProvincia ?? undefined,
      codigoPostal: record.direccionCp ?? undefined,
      latitude: record.latitud !== null ? Number(record.latitud) : undefined,
      longitude: record.longitud !== null ? Number(record.longitud) : undefined,
    },
    fechaAsignacion: record.fechaAsignacion.toISOString(),
    fechaEntrega: record.fechaEntrega?.toISOString(),
    notas: record.notas ?? undefined,
  };
}

export function toPrismaDeliveryEstado(estado: DeliveryEstado): $Enums.DeliveryEstado {
  switch (estado) {
    case DeliveryEstado.PENDIENTE:
      return $Enums.DeliveryEstado.pendiente;
    case DeliveryEstado.EN_CAMINO:
      return $Enums.DeliveryEstado.en_camino;
    case DeliveryEstado.ENTREGADA:
      return $Enums.DeliveryEstado.entregada;
    default:
      const _exhaustive: never = estado;
      throw new Error(`Unhandled estado: ${estado}`);
  }
}

export function toContractDeliveryEstado(estado: $Enums.DeliveryEstado): DeliveryEstado {
  switch (estado) {
    case $Enums.DeliveryEstado.pendiente:
      return DeliveryEstado.PENDIENTE;
    case $Enums.DeliveryEstado.en_camino:
      return DeliveryEstado.EN_CAMINO;
    case $Enums.DeliveryEstado.entregada:
      return DeliveryEstado.ENTREGADA;
    default:
      const _exhaustive: never = estado;
      throw new Error(`Unhandled estado: ${estado}`);
  }
}
