import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';

export const DELIVERY_REPOSITORY = 'DELIVERY_REPOSITORY';

export interface DeliveryRecord {
  readonly id: string;
  readonly orderId: string;
  readonly vendedorId: string;
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
}

function mapDelivery(delivery: {
  id: string;
  order_id: string;
  vendedor_id: string;
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
  latitud: number | null;
  longitud: number | null;
  fecha_asignacion: Date;
  fecha_entrega: Date | null;
  notas: string | null;
}): DeliveryRecord {
  return {
    id: delivery.id,
    orderId: delivery.order_id,
    vendedorId: delivery.vendedor_id,
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
