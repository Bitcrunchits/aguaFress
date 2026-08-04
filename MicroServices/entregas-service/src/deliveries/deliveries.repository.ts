import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';

export const DELIVERY_REPOSITORY = 'DELIVERY_REPOSITORY';

export interface DeliveryRecord {
  readonly id: string;
  readonly orderId: string;
  readonly vendedorId: string;
  readonly clienteId: string;
  readonly estado: $Enums.DeliveryEstado;
  readonly clienteNombre: string;
  readonly clienteTelefono: string | null;
  readonly direccionCalle: string;
  readonly direccionNumero: string;
  readonly direccionPiso: string | null;
  readonly direccionReferencia: string | null;
  readonly direccionBarrio: string | null;
  readonly direccionCiudad: string;
  readonly direccionProvincia: string;
  readonly direccionCp: string | null;
  readonly latitud: number | null;
  readonly longitud: number | null;
  readonly fechaAsignacion: Date;
  readonly fechaEntrega: Date | null;
  readonly notas: string | null;
}

export interface DeliveryCommandJobRecord {
  readonly id: string;
  readonly trackingId: string;
  readonly jobId: string;
  readonly deliveryId: string;
  readonly vendedorId: string;
  readonly actorUserId: string;
  readonly estado: $Enums.DeliveryEstado;
  readonly notas: string | null;
  readonly estadoAnterior: $Enums.DeliveryEstado | null;
  readonly status: $Enums.DeliveryJobStatus;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: string;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly attempts: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateDeliveryCommandJobInput {
  readonly trackingId: string;
  readonly jobId: string;
  readonly deliveryId: string;
  readonly vendedorId: string;
  readonly actorUserId: string;
  readonly estado: $Enums.DeliveryEstado;
  readonly notas: string | null;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: string;
}

export interface UpdateDeliveryCommandJobStatusInput {
  readonly status: $Enums.DeliveryJobStatus;
  readonly estadoAnterior?: $Enums.DeliveryEstado;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly attempts?: number;
}

export interface FindAllQuery {
  readonly fecha?: string;
  readonly page: number;
  readonly limit: number;
}

export interface UpdateStatusData {
  readonly estado: $Enums.DeliveryEstado;
  readonly notas?: string;
  readonly fecha_entrega?: Date;
}

export interface DeliveriesRepository {
  findAll(vendedorId: string, query: FindAllQuery): Promise<{ data: DeliveryRecord[]; total: number }>;
  findById(id: string): Promise<DeliveryRecord | null>;
  updateStatus(id: string, data: UpdateStatusData): Promise<DeliveryRecord>;
  createDeliveryCommandJob(input: CreateDeliveryCommandJobInput): Promise<DeliveryCommandJobRecord>;
  findDeliveryCommandByIdempotency(deliveryId: string, idempotencyKey: string): Promise<DeliveryCommandJobRecord | null>;
  findDeliveryCommandByTrackingId(trackingId: string): Promise<DeliveryCommandJobRecord | null>;
  updateDeliveryCommandJobStatus(id: string, input: UpdateDeliveryCommandJobStatusInput): Promise<DeliveryCommandJobRecord>;
}

@Injectable()
export class PrismaDeliveriesRepository implements DeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(vendedorId: string, query: FindAllQuery): Promise<{ data: DeliveryRecord[]; total: number }> {
    const { fecha, page = 1, limit = 10 } = query;

    const where: Prisma.DeliveryWhereInput = { vendedor_id: vendedorId };
    if (fecha) {
      const dia = new Date(`${fecha}T00:00:00`);
      const inicioDia = new Date(dia);
      inicioDia.setHours(0, 0, 0, 0);
      const finDia = new Date(dia);
      finDia.setHours(23, 59, 59, 999);
      where.fecha_asignacion = { gte: inicioDia, lte: finDia };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        orderBy: { fecha_asignacion: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: data.map(mapDelivery),
      total,
    };
  }

  async findById(id: string): Promise<DeliveryRecord | null> {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    return delivery === null ? null : mapDelivery(delivery);
  }

  async updateStatus(id: string, data: UpdateStatusData): Promise<DeliveryRecord> {
    const delivery = await this.prisma.delivery.update({
      where: { id },
      data: {
        estado: data.estado,
        notas: data.notas ?? undefined,
        fecha_entrega: data.fecha_entrega,
      },
    });
    return mapDelivery(delivery);
  }

  // ─── DeliveryCommandJob methods ────────────────────────

  async createDeliveryCommandJob(input: CreateDeliveryCommandJobInput): Promise<DeliveryCommandJobRecord> {
    const record = await this.prisma.deliveryCommandJob.create({
      data: {
        tracking_id: input.trackingId,
        job_id: input.jobId,
        delivery_id: input.deliveryId,
        vendedor_id: input.vendedorId,
        actor_user_id: input.actorUserId,
        estado: input.estado,
        notas: input.notas,
        idempotency_key: input.idempotencyKey,
        payload_fingerprint: input.payloadFingerprint,
      },
    });
    return mapDeliveryCommandJob(record);
  }

  async findDeliveryCommandByIdempotency(deliveryId: string, idempotencyKey: string): Promise<DeliveryCommandJobRecord | null> {
    const record = await this.prisma.deliveryCommandJob.findUnique({
      where: {
        delivery_id_idempotency_key: { delivery_id: deliveryId, idempotency_key: idempotencyKey },
      },
    });
    return record === null ? null : mapDeliveryCommandJob(record);
  }

  async findDeliveryCommandByTrackingId(trackingId: string): Promise<DeliveryCommandJobRecord | null> {
    const record = await this.prisma.deliveryCommandJob.findUnique({
      where: { tracking_id: trackingId },
    });
    return record === null ? null : mapDeliveryCommandJob(record);
  }

  async updateDeliveryCommandJobStatus(id: string, input: UpdateDeliveryCommandJobStatusInput): Promise<DeliveryCommandJobRecord> {
    const record = await this.prisma.deliveryCommandJob.update({
      where: { id },
      data: {
        status: input.status,
        estado_anterior: input.estadoAnterior,
        error_code: input.errorCode,
        error_message: input.errorMessage,
        attempts: input.attempts,
      },
    });
    return mapDeliveryCommandJob(record);
  }
}

function mapDelivery(delivery: {
  id: string;
  order_id: string;
  vendedor_id: string;
  cliente_id: string;
  estado: $Enums.DeliveryEstado;
  cliente_nombre: string;
  cliente_telefono: string | null;
  direccion_calle: string;
  direccion_numero: string;
  direccion_piso: string | null;
  direccion_referencia: string | null;
  direccion_barrio: string | null;
  direccion_ciudad: string;
  direccion_provincia: string;
  direccion_cp: string | null;
  latitud: Prisma.Decimal | null;
  longitud: Prisma.Decimal | null;
  fecha_asignacion: Date;
  fecha_entrega: Date | null;
  notas: string | null;
}): DeliveryRecord {
  return {
    id: delivery.id,
    orderId: delivery.order_id,
    vendedorId: delivery.vendedor_id,
    clienteId: delivery.cliente_id,
    estado: delivery.estado,
    clienteNombre: delivery.cliente_nombre,
    clienteTelefono: delivery.cliente_telefono,
    direccionCalle: delivery.direccion_calle,
    direccionNumero: delivery.direccion_numero,
    direccionPiso: delivery.direccion_piso,
    direccionReferencia: delivery.direccion_referencia,
    direccionBarrio: delivery.direccion_barrio,
    direccionCiudad: delivery.direccion_ciudad,
    direccionProvincia: delivery.direccion_provincia,
    direccionCp: delivery.direccion_cp,
    latitud: delivery.latitud !== null ? Number(delivery.latitud) : null,
    longitud: delivery.longitud !== null ? Number(delivery.longitud) : null,
    fechaAsignacion: delivery.fecha_asignacion,
    fechaEntrega: delivery.fecha_entrega,
    notas: delivery.notas,
  };
}

function mapDeliveryCommandJob(record: {
  id: string;
  tracking_id: string;
  job_id: string;
  delivery_id: string;
  vendedor_id: string;
  actor_user_id: string;
  estado: $Enums.DeliveryEstado;
  notas: string | null;
  estado_anterior: $Enums.DeliveryEstado | null;
  status: $Enums.DeliveryJobStatus;
  idempotency_key: string;
  payload_fingerprint: string;
  error_code: string | null;
  error_message: string | null;
  attempts: number;
  created_at: Date;
  updated_at: Date;
}): DeliveryCommandJobRecord {
  return {
    id: record.id,
    trackingId: record.tracking_id,
    jobId: record.job_id,
    deliveryId: record.delivery_id,
    vendedorId: record.vendedor_id,
    actorUserId: record.actor_user_id,
    estado: record.estado,
    notas: record.notas,
    estadoAnterior: record.estado_anterior,
    status: record.status,
    idempotencyKey: record.idempotency_key,
    payloadFingerprint: record.payload_fingerprint,
    errorCode: record.error_code,
    errorMessage: record.error_message,
    attempts: record.attempts,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
