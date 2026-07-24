import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { LinkInvitacionService } from './link-invitacion.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [],
  providers: [LinkInvitacionService, VendedorGuard],
  exports: [LinkInvitacionService],
})
export class LinkInvitacionModule {}
