// Common — Guards, decorators, pipes compartidos del servicio
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './tokens';

@Module({
    providers: [
      PrismaService,
      {
        provide: REDIS_CLIENT,
        useFactory: () => {
          const url = process.env.REDIS_URL || 'redis://localhost:6379';
          return new Redis(url);
        },
      },
    ],
    exports: [PrismaService, REDIS_CLIENT],
})
export class CommonModule {}
