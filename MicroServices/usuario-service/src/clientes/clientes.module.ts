import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { ClientesService } from './clientes.service';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [],
  providers: [ClientesService, VendedorGuard],
  exports: [ClientesService],
})
export class ClientesModule {}
