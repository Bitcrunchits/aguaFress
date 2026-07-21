import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole, type ActivityLogDetailResponseDTO, type ActivityLogListResponseDTO } from '@agua/contracts';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { TcpPayload } from '../tcp/tcp-payload';
import { ActivityLogsService } from './activity-logs.service';

@Controller()
export class ActivityLogsTcpController {
  constructor(
    private readonly activityLogsService: ActivityLogsService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  @MessagePattern('activity_logs.list')
  list(@Payload() payload: TcpPayload): Promise<ActivityLogListResponseDTO> {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.activityLogsService.list(this.payloadAdapter.listRequest(payload));
  }

  @MessagePattern('activity_logs.get-by-id')
  getById(@Payload() payload: TcpPayload): Promise<ActivityLogDetailResponseDTO> {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.activityLogsService.getById(this.payloadAdapter.getByIdRequest(payload));
  }

  @MessagePattern('activity_logs.create')
  create(@Payload() payload: TcpPayload): Promise<ActivityLogDetailResponseDTO> {
    return this.activityLogsService.create(this.payloadAdapter.createRequest(payload));
  }
}
