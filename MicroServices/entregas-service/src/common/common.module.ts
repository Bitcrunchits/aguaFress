// Common — Guards, decorators, pipes compartidos del servicio
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class CommonModule {}
