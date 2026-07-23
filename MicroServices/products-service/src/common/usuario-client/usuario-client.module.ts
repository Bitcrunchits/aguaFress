import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const USUARIO_CLIENT = 'USUARIO_CLIENT';

/**
 * products-service ahora necesita hablarle a usuario-service por TCP para
 * resolver vendedorId (ver VendedorResolverClient). Antes no hacía falta.
 *
 * Mismo patrón de registro que usa gateway/src/tcp/tcp-clients.module.ts.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USUARIO_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('USUARIO_SERVICE_HOST'),
            port: configService.getOrThrow<number>('USUARIO_SERVICE_TCP_PORT'),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class UsuarioClientModule {}
