import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { VendedoresService } from './vendedores.service';
import { VendedorGuard } from './guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [],
  providers: [VendedoresService, VendedorGuard],
  exports: [VendedoresService],
})
export class VendedoresModule {}
