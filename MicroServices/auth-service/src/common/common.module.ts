import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { RpcExceptionFilter } from './filters/rpc-exception.filter';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: RpcExceptionFilter,
    },
  ],
  exports: [PrismaService],
})
export class CommonModule {}
