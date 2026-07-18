import {Module} from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TcpModule } from './tcp/tcp.module';
@Module({
    imports: [CommonModule, TcpModule],
})
export class AppModule {}