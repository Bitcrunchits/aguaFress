import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { QrCodesService } from './qr-codes.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [],
  providers: [QrCodesService, VendedorGuard],
  exports: [QrCodesService],
})
export class QrCodesModule {}
