import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GatewayController } from './gateway.controller';
import { ActionsModule } from './actions/actions.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { createGatewayEnv } from './config/env.config';
import { DocsModule } from './docs/docs.module';
import { HealthModule } from './health/health.module';
import { GatewayRateLimitGuard } from './rate-limit/gateway-rate-limit.guard';
import { ProtectedRouteRateLimitGuard } from './rate-limit/protected-route-rate-limit.guard';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { TcpModule } from './tcp/tcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: createGatewayEnv,
    }),
    ActionsModule,
    TcpModule,
    AuthModule,
    DocsModule,
    HealthModule,
    RateLimitModule,
  ],
  controllers: [GatewayController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ProtectedRouteRateLimitGuard,
    },
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
      useClass: GatewayRateLimitGuard,
    },
  ],
})
export class AppModule {}
