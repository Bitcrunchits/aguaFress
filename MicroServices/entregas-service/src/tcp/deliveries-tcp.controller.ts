import { Controller, Inject, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import { QueryDeliveriesDto } from '../deliveries/dto/query-deliveries.dto';
import { VENDEDOR_PROFILE_RESOLVER_PORT, type VendedorProfileResolverPort } from '../deliveries/vendedor-profile-resolver.port';
import { DELIVERY_REPOSITORY, type DeliveriesRepository } from '../deliveries/deliveries.repository';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class DeliveriesTcpController {
  constructor(
    private readonly deliveriesService: DeliveriesService,
    private readonly payloadAdapter: TcpPayloadAdapter,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
    private readonly vendedorProfileResolver: VendedorProfileResolverPort,
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveriesRepository,
  ) {}

  @MessagePattern('deliveries.list')
  async list(@Payload() payload: TcpPayload) {
    const query = await this.payloadAdapter.query(payload, QueryDeliveriesDto);
    const vendedorId = await this.resolveVendedorId(payload);
    return this.deliveriesService.findAll(query, vendedorId);
  }

  @MessagePattern('deliveries.get')
  async get(@Payload() payload: TcpPayload) {
    const id = payload.params?.id ?? payload.query?.id ?? '';
    const vendedorId = await this.resolveVendedorId(payload);
    return this.deliveriesService.findOne(id, vendedorId);
  }

  @MessagePattern('deliveries.job_status')
  async jobStatus(@Payload() payload: TcpPayload) {
    const trackingId = payload.query?.id ?? payload.params?.id ?? '';
    if (!trackingId) {
      throw new NotFoundException('Tracking id is required');
    }

    const record = await this.deliveryRepository.findDeliveryCommandByTrackingId(trackingId);
    if (record === null) {
      throw new NotFoundException('Delivery job was not found');
    }

    return record;
  }

  private async resolveVendedorId(payload: TcpPayload): Promise<string> {
    return this.vendedorProfileResolver.resolveVendedorIdByAuthUserId(
      this.payloadAdapter.userId(payload),
    );
  }
}
