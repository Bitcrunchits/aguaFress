import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const USUARIO_CLIENT = 'USUARIO_CLIENT';
export const ORDERS_CLIENT = 'ORDERS_CLIENT';

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
      {
        name: ORDERS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('ORDERS_SERVICE_HOST'),
            port: configService.getOrThrow<number>('ORDERS_SERVICE_TCP_PORT'),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class TcpClientsModule {}
