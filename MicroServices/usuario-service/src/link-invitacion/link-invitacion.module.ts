import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { LinkInvitacionService } from './link-invitacion.service';
import { LinkInvitacionVendorController } from './link-invitacion-vendor.controller';
import { LinkInvitacionAdminController } from './link-invitacion-admin.controller';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  // Vendor controller first so POST/GET /link-invitacion win before /:id routes
  controllers: [LinkInvitacionVendorController, LinkInvitacionAdminController],
  providers: [LinkInvitacionService, VendedorGuard],
  exports: [LinkInvitacionService],
})
export class LinkInvitacionModule {}
