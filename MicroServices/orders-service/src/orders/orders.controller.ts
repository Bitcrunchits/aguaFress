import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { TcpPayload } from '../tcp/tcp-payload';
import {
  parseCancelOrderRequest,
  parseConfirmOrderRequest,
  parseCreateOrderRequest,
  parseUpdateOrderStatusRequest,
  type OrderResponse,
} from './orders.dto';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(
    private readonly payloadAdapter: TcpPayloadAdapter,
    private readonly ordersService: OrdersService,
  ) {}

  @MessagePattern('orders.list')
  list(@Payload() payload: TcpPayload): Promise<readonly OrderResponse[]> {
    return this.ordersService.list(this.payloadAdapter.requireUser(payload));
  }

  @MessagePattern('orders.get_by_id')
  getById(@Payload() payload: TcpPayload): Promise<OrderResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.ordersService.getById(user, readQueryId(payload));
  }

  @MessagePattern('orders.create')
  create(@Payload() payload: TcpPayload): Promise<OrderResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.ordersService.create(user, parseCreateOrderRequest(payload.body));
  }

  @MessagePattern('orders.status_update')
  updateStatus(@Payload() payload: TcpPayload): Promise<OrderResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    const request = parseUpdateOrderStatusRequest(payload.body);
    return this.ordersService.updateStatus(user, request.id, request.estado, request.notas);
  }

  @MessagePattern('orders.cancel')
  cancel(@Payload() payload: TcpPayload): Promise<OrderResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    const request = parseCancelOrderRequest(payload.body);
    return this.ordersService.cancel(user, request.id, request.motivo);
  }

  @MessagePattern('orders.confirm')
  confirm(@Payload() payload: TcpPayload): Promise<OrderResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    const request = parseConfirmOrderRequest(payload.body);
    return this.ordersService.confirm(user, request.id);
  }
}

function readQueryId(payload: TcpPayload): string {
  const id = payload.query?.id;
  if (id === undefined || id.trim() === '') {
    throw new BadRequestException('Order id is required');
  }

  return id;
}
