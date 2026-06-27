import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { VendedoresService } from './vendedores.service';
import { VendedoresController } from './vendedores.controller';
import { VendedorProfileController } from './vendedor-profile.controller';
import { VendedorGuard } from './guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  // Profile controller first so static /vendedores/me wins over /vendedores/:id
  controllers: [VendedorProfileController, VendedoresController],
  providers: [VendedoresService, VendedorGuard],
  exports: [VendedoresService],
})
export class VendedoresModule {}
