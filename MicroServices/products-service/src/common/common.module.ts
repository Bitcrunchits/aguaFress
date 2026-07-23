// Common — Guards, decorators, pipes compartidos del servicio

import { Module, Global, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { PricingService } from './prisma/pricing.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

// NOTA: se sacó TransformInterceptor — envolvía respuestas HTTP en
// { data, timestamp, path }, pero products-service es TCP-only:
// en ese contexto era código muerto (siempre tomaba la rama "no-op").
const globalInterceptors: Provider[] = [
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
];

@Global()
@Module({
  providers: [PrismaService, PricingService, ...globalInterceptors],
  exports: [PrismaService, PricingService],
})
export class CommonModule {}
