import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@agua/contracts';
import { QrCodesService } from './qr-codes.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

@Controller('admin/qr-codes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class QrCodesAdminController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Get()
  async list(@Query() dto: ListQrCodesDto) {
    if (!dto.vendedorId) {
      throw new BadRequestException('vendedorId is required');
    }
    return this.qrCodesService.listByVendedor(dto.vendedorId, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.qrCodesService.deactivateAdmin(id);
  }
}
