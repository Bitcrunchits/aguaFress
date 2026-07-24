import { Module, Global, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { VendedorResolver } from './prisma/vendedor-resolver.service';
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
  providers: [PrismaService, VendedorResolver, ...globalInterceptors],
  exports: [PrismaService, VendedorResolver],
})
export class CommonModule {}
