import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QrCodesService } from './qr-codes.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

@Controller('qr-codes')
@UseGuards(VendedorGuard)
export class QrCodesVendorController {
  constructor(
    private readonly qrCodesService: QrCodesService,
    private readonly resolver: VendedorResolver,
  ) {}

  @Post()
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
  async list(
    @CurrentUser('userId') userId: string,
    @Query() dto: ListQrCodesDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.qrCodesService.list(vendedorId, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.qrCodesService.deactivate(id, vendedorId);
  }
}
