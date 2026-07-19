import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { Delivery } from '@prisma/client';
import { DeliveryEstado, DeliveryResponse } from "@agua/contracts";
import { PrismaService } from "../common/prisma/prisma.service";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";
import { QueryDeliveriesDto } from "./dto/query-deliveries.dto";
@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  //GET /deliveries- entregas del día paginadas
  async findAll(query: QueryDeliveriesDto, vendedorId: string) {
  const { fecha, page = 1, limit = 10 } = query;
  //rango del día- periodo
  const dia = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    const inicioDia = new Date(dia);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(dia);
    finDia.setHours(23, 59, 59, 999);
  
    const where = {
      vendedor_id:vendedorId,
      fecha_asignacion: {
        gte: inicioDia,
        lte: finDia,
      },
    };
  
    const [ entregas, total ] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        orderBy: { fecha_asignacion: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);
     return {
        data: entregas.map((entrega) => this.toResponse(entrega)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
    //GET /deliveries/:id - entrega por id
    async findOne(id: string, vendedorId: string): Promise<DeliveryResponse> {
      const entrega = await this.prisma.delivery.findUnique({ where: { id } });
      if (!entrega) {
        throw new NotFoundException(`Entrega ${id} no encontrada`);
      }
      if (entrega.vendedor_id !== vendedorId) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
      return this.toResponse(entrega);
    }
    //PATCH /deliveries/:id/status - actualizar estado de entrega
    async updateStatus(id: string, dto: UpdateDeliveryStatusDto, vendedorId: string): Promise<DeliveryResponse> {
        const entrega = await this.prisma.delivery.findUnique({ where: { id } });
        if (!entrega) {
          throw new NotFoundException(`Entrega ${id} no encontrada`);
        }
        if (entrega.vendedor_id !== vendedorId) {
          throw new ForbiddenException(`No tiene acceso a esta entrega`)
        }
    //Manejo de estados
    const transicionesValidas: Record<string, DeliveryEstado[]> = {
      [DeliveryEstado.PENDIENTE]: [DeliveryEstado.EN_CAMINO],
      [DeliveryEstado.EN_CAMINO]: [DeliveryEstado.ENTREGADA],
      [DeliveryEstado.ENTREGADA]: [],
    };
    if (!transicionesValidas[entrega.estado].includes(dto.estado)) {
      throw new BadRequestException(`Transición de estado inválida:'${entrega.estado}' no se puede pasar a'${dto.estado}'`);
    }
     const actualizada = await this.prisma.delivery.update({
        where: { id },
        data: { 
            estado: dto.estado,
            notas: dto.notas ?? undefined,
            fecha_entrega: dto.estado === DeliveryEstado.ENTREGADA ? new Date() : undefined,
        },
      });
      // respuesta segun actualización de contato
      return this.toResponse(actualizada);
    }
    //Método privado para mapear la entidad Delivery a DeliveryResponse
    private toResponse(entrega: Delivery): DeliveryResponse {
      return {
        id: entrega.id,
        orderId: entrega.order_id,
        vendedorId: entrega.vendedor_id,
        estado: entrega.estado as DeliveryEstado,
        cliente: {
          nombre: entrega.cliente_nombre,
          telefono: entrega.cliente_telefono ?? undefined,
        },
        direccion: {
          calle: entrega.direccion_calle,
          numero: entrega.direccion_numero,
          pisoDepto: entrega.direccion_piso ?? undefined,
          referencia: entrega.direccion_referencia ?? undefined,
          barrio: entrega.direccion_barrio ?? undefined,
          ciudad: entrega.direccion_ciudad ?? undefined,
          provincia: entrega.direccion_provincia ?? undefined,
          codigoPostal: entrega.direccion_cp ?? undefined,
          latitude: entrega.latitud !== null ? Number(entrega.latitud) : undefined,
          longitude: entrega.longitud !== null ? Number(entrega.longitud) : undefined,
        },
        fechaAsignacion: entrega.fecha_asignacion.toISOString(),
        fechaEntrega: entrega.fecha_entrega?.toISOString(),
        notas: entrega.notas ?? undefined,
      };
    }
}