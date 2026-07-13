// Common — Guards, decorators, pipes compartidos del servicio

import { Module, Global, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { PricingService } from './prisma/pricing.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

const globalInterceptors: Provider[] = [
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
];

@Global()
@Module({
  providers: [PrismaService, PricingService, ...globalInterceptors],
  exports: [PrismaService, PricingService],
})
export class CommonModule {}
