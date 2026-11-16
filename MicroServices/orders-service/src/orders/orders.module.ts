import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TcpModule } from '../tcp/tcp.module';
import { OrdersController } from './orders.controller';
import { OrderCommandTrackingService } from './jobs/order-command-tracking.service';
import { OrderCreateJobProcessor } from './jobs/order-create-job.processor';
import { OrdersCreateWorker } from './jobs/orders-create.worker';
import { PrismaOrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { UsuarioClienteProfileResolverAdapter } from './usuario-cliente-profile-resolver.adapter';
import { SCOPED_CLIENTE_PROFILE_RESOLVER_PORT } from './cliente-profile-resolver.port';
import { UsuarioVendedorProfileResolverAdapter } from './usuario-vendedor-profile-resolver.adapter';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from './vendedor-profile-resolver.port';
import { UsuarioVendedorProfileNamesResolverAdapter } from './usuario-vendedor-profile-names-resolver.adapter';
import { VENDEDOR_PROFILE_NAMES_RESOLVER_PORT } from './vendedor-profile-names-resolver.port';

@Module({
  imports: [CommonModule, TcpModule],
  controllers: [OrdersController],
  providers: [
    PrismaOrdersRepository,
    OrdersService,
    OrderCommandTrackingService,
    OrderCreateJobProcessor,
    OrdersCreateWorker,
    UsuarioVendedorProfileResolverAdapter,
    { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useExisting: UsuarioVendedorProfileResolverAdapter },
    UsuarioClienteProfileResolverAdapter,
    { provide: SCOPED_CLIENTE_PROFILE_RESOLVER_PORT, useExisting: UsuarioClienteProfileResolverAdapter },
    UsuarioVendedorProfileNamesResolverAdapter,
    { provide: VENDEDOR_PROFILE_NAMES_RESOLVER_PORT, useExisting: UsuarioVendedorProfileNamesResolverAdapter },
  ],
})
export class OrdersModule {}
