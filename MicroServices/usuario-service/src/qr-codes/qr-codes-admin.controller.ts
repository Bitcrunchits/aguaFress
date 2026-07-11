import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@agua/contracts';
import { QrCodesService } from './qr-codes.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

@Controller('admin/qr-codes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiTags('QR Codes (Admin)')
@ApiBearerAuth()
export class QrCodesAdminController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Get()
  @ApiOperation({ summary: 'List all QR codes (admin)', description: 'List QR codes for a specific vendedor' })
  @ApiResponse({ status: 200, description: 'QR codes list retrieved' })
  @ApiResponse({ status: 400, description: 'vendedorId is required' })
  async list(@Query() dto: ListQrCodesDto) {
    if (!dto.vendedorId) {
      throw new BadRequestException('vendedorId is required');
    }
    return this.qrCodesService.listByVendedor(dto.vendedorId, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate QR code (admin)', description: 'Admin force-deactivate any QR code' })
  @ApiResponse({ status: 200, description: 'QR code deactivated' })
  @ApiResponse({ status: 404, description: 'QR code not found' })
  async deactivate(@Param('id') id: string) {
    return this.qrCodesService.deactivateAdmin(id);
  }
}
