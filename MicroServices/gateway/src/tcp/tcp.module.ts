import { Global, Module } from '@nestjs/common';
import { TcpClientsModule } from './tcp-clients.module';
import { TcpDispatcherService } from './tcp-dispatcher.service';

@Global()
@Module({
  imports: [TcpClientsModule],
  providers: [TcpDispatcherService],
  exports: [TcpDispatcherService],
})
export class TcpModule {}
