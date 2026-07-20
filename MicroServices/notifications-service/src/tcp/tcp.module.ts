import { Module } from '@nestjs/common';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';

@Module({
  providers: [TcpPayloadAdapter],
  exports: [TcpPayloadAdapter],
})
export class TcpModule {}
