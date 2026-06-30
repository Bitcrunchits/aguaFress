import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { QrCodesService } from './qr-codes.service';
import { QrCodesVendorController } from './qr-codes-vendor.controller';
import { QrCodesAdminController } from './qr-codes-admin.controller';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  // Vendor controller first so POST/GET /qr-codes win before /:id routes
  controllers: [QrCodesVendorController, QrCodesAdminController],
  providers: [QrCodesService, VendedorGuard],
})
export class QrCodesModule {}
