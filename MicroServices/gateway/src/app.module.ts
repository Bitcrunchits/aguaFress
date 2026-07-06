import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GatewayController } from './gateway.controller';
import { ActionsModule } from './actions/actions.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { createGatewayEnv } from './config/env.config';
import { HealthModule } from './health/health.module';
import { TcpModule } from './tcp/tcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: createGatewayEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('RATE_LIMIT_TTL_MS', 60000),
          limit: config.get('RATE_LIMIT_MAX', 100),
        },
      ],
    }),
    ActionsModule,
    TcpModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [GatewayController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
