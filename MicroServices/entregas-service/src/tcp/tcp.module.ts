import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { DeliveriesTcpController } from './deliveries-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';

@Module({
imports:[CommonModule, DeliveriesModule],
controllers: [DeliveriesTcpController],
providers:[TcpPayloadAdapter],
})
export class TcpModule {}