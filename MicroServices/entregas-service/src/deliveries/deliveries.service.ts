import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DeliveryEstado } from "@agua/contracts";
import { $Enums } from '../generated/prisma';
import { DELIVERY_REPOSITORY, type DeliveriesRepository } from "./deliveries.repository";
import { toDeliveryResponse, toPrismaDeliveryEstado, toContractDeliveryEstado } from "./delivery.mapper";
import { DELIVERY_EVENT_PUBLISHER, type DeliveryEventPublisher } from "./delivery-event-publisher.port";
import type { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";
import type { QueryDeliveriesDto } from "./dto/query-deliveries.dto";

const TRANSICIONES_VALIDAS: Record<$Enums.DeliveryEstado, readonly DeliveryEstado[]> = {
  [$Enums.DeliveryEstado.pendiente]: [DeliveryEstado.EN_CAMINO],
  [$Enums.DeliveryEstado.en_camino]: [DeliveryEstado.ENTREGADA],
  [$Enums.DeliveryEstado.entregada]: [],
};

@Injectable()
export class DeliveriesService {
  constructor(
    @Inject(DELIVERY_REPOSITORY) private readonly repository: DeliveriesRepository,
    @Inject(DELIVERY_EVENT_PUBLISHER) private readonly eventPublisher: DeliveryEventPublisher,
  ) {}

  async findAll(query: QueryDeliveriesDto, vendedorId: string) {
    const { fecha, page = 1, limit = 10 } = query;

    const { data, total } = await this.repository.findAll(vendedorId, {
      fecha,
      page,
      limit,
    });

    return {
      data: data.map(toDeliveryResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, vendedorId: string) {
    const entrega = await this.repository.findById(id);
    if (!entrega) {
      throw new NotFoundException(`Entrega ${id} no encontrada`);
    }
    if (entrega.vendedorId !== vendedorId) {
      throw new ForbiddenException('No tiene acceso a esta entrega');
    }
    return toDeliveryResponse(entrega);
  }

  async updateStatus(id: string, dto: UpdateDeliveryStatusDto, vendedorId: string, actorUserId: string) {
    const entrega = await this.repository.findById(id);
    if (!entrega) {
      throw new NotFoundException(`Entrega ${id} no encontrada`);
    }
    if (entrega.vendedorId !== vendedorId) {
      throw new ForbiddenException('No tiene acceso a esta entrega');
    }

    const transiciones = TRANSICIONES_VALIDAS[entrega.estado];
    if (!transiciones.includes(dto.estado)) {
      throw new BadRequestException(
        `Transición de estado inválida: '${entrega.estado}' no se puede pasar a '${dto.estado}'`,
      );
    }

    const estadoAnterior = toContractDeliveryEstado(entrega.estado);

    const actualizada = await this.repository.updateStatus(id, {
      estado: toPrismaDeliveryEstado(dto.estado),
      notas: dto.notas ?? undefined,
      fecha_entrega: dto.estado === DeliveryEstado.ENTREGADA ? new Date() : undefined,
    });

    await this.eventPublisher.publishStatusChanged({
      type: 'DeliveryStatusChanged',
      deliveryId: id,
      orderId: entrega.orderId,
      estadoAnterior: estadoAnterior,
      estadoNuevo: dto.estado,
      actorUserId,
      timestamp: new Date().toISOString(),
    });

    return toDeliveryResponse(actualizada);
  }
}
