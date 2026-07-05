import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { ClientesService } from './clientes.service';
import { ClienteVendedorController } from './cliente-vendedor.controller';
import { ClientesController } from './clientes.controller';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';

@Module({
  imports: [AuthModule, CommonModule],
  // ClienteVendedorController first so /clientes/mios wins over /clientes/:id
  controllers: [ClienteVendedorController, ClientesController],
  providers: [ClientesService, VendedorGuard],
  exports: [ClientesService],
})
export class ClientesModule {}
