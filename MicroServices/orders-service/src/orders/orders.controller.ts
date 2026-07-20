import { BadRequestException, Controller, NotFoundException } from '@nestjs/common';
import { UserRole, type OrderJobStatusResponse, type OrderListResponse, type PaginatedResponse } from '@agua/contracts';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { TcpAuthenticatedUser, TcpPayload } from '../tcp/tcp-payload';
import {
  parseCancelOrderRequest,
  parseConfirmOrderRequest,
  parseCreateOrderRequest,
  parseOrderListFilters,
  parseUpdateOrderStatusRequest,
  type OrderResponse,
} from './orders.dto';
import { OrdersService } from './orders.service';
import { OrderCommandTrackingService } from './jobs/order-command-tracking.service';

@Controller()
export class OrdersController {
  constructor(
    private readonly payloadAdapter: TcpPayloadAdapter,
    private readonly ordersService: OrdersService,
    private readonly trackingService: OrderCommandTrackingService,
  ) {}

  @MessagePattern('orders.list')
  list(@Payload() payload: TcpPayload): Promise<PaginatedResponse<OrderListResponse>> {
    return this.ordersService.list(this.payloadAdapter.requireUser(payload), parseOrderListFilters(payload.query));
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

  @MessagePattern('orders.job_status')
  async jobStatus(@Payload() payload: TcpPayload): Promise<OrderJobStatusResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    const status = await this.trackingService.findByTrackingId(readQueryId(payload));
    if (status === null || !canReadJobStatus(user, status)) {
      throw new NotFoundException('Order job was not found');
    }

    return status;
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

function canReadJobStatus(user: TcpAuthenticatedUser, status: OrderJobStatusResponse): boolean {
  if (user.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  return user.role === UserRole.CLIENTE && status.clienteId === user.userId;
}
