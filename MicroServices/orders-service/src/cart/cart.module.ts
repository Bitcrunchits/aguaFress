import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TcpModule } from '../tcp/tcp.module';
import { CartController } from './cart.controller';
import { PrismaCartRepository } from './cart.repository';
import { CartService } from './cart.service';

@Module({
  imports: [CommonModule, TcpModule],
  controllers: [CartController],
  providers: [PrismaCartRepository, CartService],
})
export class CartModule {}
