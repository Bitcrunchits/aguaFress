import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TcpModule } from './tcp/tcp.module';
import { JobsModule } from './common/jobs/jobs.module';

@Module({
  imports: [CommonModule, TcpModule, JobsModule],
})
export class AppModule {}