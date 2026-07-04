import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@agua/contracts';
import { AuditLogService } from './audit-log.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Controller('admin/audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AuditLogAdminController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
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
