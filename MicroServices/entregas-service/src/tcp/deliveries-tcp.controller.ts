import { Controller} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import { QueryDeliveriesDto } from '../deliveries/dto/query-deliveries.dto';
import { UpdateDeliveryStatusDto } from '../deliveries/dto/update-delivery-status.dto';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class DeliveriesTcpController {
  constructor(
    private readonly deliveriesService: DeliveriesService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  @MessagePattern('deliveries.list')
async list(@Payload() payload: TcpPayload) {
  const query = await this.payloadAdapter.query(payload, QueryDeliveriesDto);
  return this.deliveriesService.findAll(query);
}

  @MessagePattern('deliveries.get')
  async get(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireUser(payload);
    const id = payload.params?.id ?? payload.query?.id ?? '';
    return this.deliveriesService.findOne(id);
  }

  @MessagePattern('deliveries.update_status')
  async updateStatus(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireUser(payload);
    const id = payload.params?.id ?? payload.query?.id ?? '';
    const dto = await this.payloadAdapter.body(payload, UpdateDeliveryStatusDto);
    return this.deliveriesService.updateStatus(id, dto);
  }
}