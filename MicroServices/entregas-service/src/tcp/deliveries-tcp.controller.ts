import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import { QueryDeliveriesDto } from '../deliveries/dto/query-deliveries.dto';
import { UpdateDeliveryStatusDto } from '../deliveries/dto/update-delivery-status.dto';
import { VENDEDOR_PROFILE_RESOLVER_PORT, type VendedorProfileResolverPort } from '../deliveries/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class DeliveriesTcpController {
  constructor(
    private readonly deliveriesService: DeliveriesService,
    private readonly payloadAdapter: TcpPayloadAdapter,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
    private readonly vendedorProfileResolver: VendedorProfileResolverPort,
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

  @MessagePattern('deliveries.update_status')
  async updateStatus(@Payload() payload: TcpPayload) {
    const user = this.payloadAdapter.requireUser(payload);
    const id = payload.params?.id ?? payload.query?.id ?? '';
    const dto = await this.payloadAdapter.body(payload, UpdateDeliveryStatusDto);
    const vendedorId = await this.resolveVendedorId(payload);
    return this.deliveriesService.updateStatus(id, dto, vendedorId, user.sub ?? user.userId);
  }

  private async resolveVendedorId(payload: TcpPayload): Promise<string> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.vendedorProfileResolver.resolveVendedorIdByAuthUserId(
      user.sub ?? user.userId,
    );
  }
}
