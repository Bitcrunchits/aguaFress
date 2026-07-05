import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { QrCodesService } from './qr-codes.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

@Controller('qr-codes')
@UseGuards(VendedorGuard)
@ApiTags('QR Codes (Vendor)')
@ApiBearerAuth()
export class QrCodesVendorController {
  constructor(
    private readonly qrCodesService: QrCodesService,
    private readonly resolver: VendedorResolver,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create QR code', description: 'Generate a new QR code for client invitation' })
  @ApiResponse({ status: 201, description: 'QR code created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@CurrentUser('userId') userId: string) {
    const vendedorId = await this.resolver.resolve(userId);
    const qr = await this.qrCodesService.create(vendedorId, userId);
    return {
      qrCode: qr.codigo,
      url: `https://agua.app/invitar/${qr.codigo}`,
      expiresAt: qr.expires_at.toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List QR codes', description: "List the vendor's QR codes with pagination" })
  @ApiResponse({ status: 200, description: 'QR codes list retrieved' })
  async list(
    @CurrentUser('userId') userId: string,
    @Query() dto: ListQrCodesDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.qrCodesService.list(vendedorId, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate QR code', description: 'Deactivate a QR code so it can no longer be used' })
  @ApiResponse({ status: 200, description: 'QR code deactivated' })
  @ApiResponse({ status: 404, description: 'QR code not found' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.qrCodesService.deactivate(id, vendedorId);
  }
}
