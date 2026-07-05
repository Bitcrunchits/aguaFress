import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@agua/contracts';
import { AuditLogService } from './audit-log.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Controller('admin/audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiTags('Audit Logs')
@ApiBearerAuth()
export class AuditLogAdminController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs', description: 'List audit log entries with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Audit logs list retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async list(
    @Query(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    )
    dto: ListAuditLogsDto,
  ) {
    return this.auditLogService.findAll(dto);
  }
}
