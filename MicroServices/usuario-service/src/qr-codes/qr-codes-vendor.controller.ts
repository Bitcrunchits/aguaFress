import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QrCodesService } from './qr-codes.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

@Controller('qr-codes')
@UseGuards(AuthGuard('jwt'), VendedorGuard)
export class QrCodesVendorController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post()
  async create(@CurrentUser('userId') userId: string) {
    const qr = await this.qrCodesService.create(userId);
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
    return this.qrCodesService.list(userId, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.qrCodesService.deactivate(id, userId);
  }
}
