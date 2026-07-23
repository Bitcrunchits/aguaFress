// Módulo deliveries — Repartos, estados, asignación
import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { DeliveriesService } from './deliveries.service';
import { PrismaDeliveriesRepository, DELIVERY_REPOSITORY } from './deliveries.repository';
import { RedisDeliveryEventPublisher } from './delivery-event-publisher.redis';
import { DELIVERY_EVENT_PUBLISHER } from './delivery-event-publisher.port';
import { CommonModule } from '../common/common.module';
import { USUARIO_SERVICE_CLIENT } from '../common/tokens';
import { UsuarioVendedorProfileResolverAdapter } from './usuario-vendedor-profile-resolver.adapter';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from './vendedor-profile-resolver.port';

@Module({
  imports: [CommonModule],
  providers: [
    DeliveriesService,
    { provide: DELIVERY_REPOSITORY, useClass: PrismaDeliveriesRepository },
    { provide: DELIVERY_EVENT_PUBLISHER, useClass: RedisDeliveryEventPublisher },
    {
      provide: USUARIO_SERVICE_CLIENT,
      useFactory: () => ClientProxyFactory.create({
        transport: Transport.TCP,
        options: {
          host: process.env.USUARIO_SERVICE_HOST || 'usuario-service',
          port: parseInt(process.env.USUARIO_SERVICE_TCP_PORT || '3011', 10),
        },
      }),
    },
    UsuarioVendedorProfileResolverAdapter,
    { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useExisting: UsuarioVendedorProfileResolverAdapter },
  ],
  exports: [DeliveriesService, DELIVERY_REPOSITORY, DELIVERY_EVENT_PUBLISHER, VENDEDOR_PROFILE_RESOLVER_PORT],
})
export class DeliveriesModule {}
