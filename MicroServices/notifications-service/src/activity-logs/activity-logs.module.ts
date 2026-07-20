import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TcpModule } from '../tcp/tcp.module';
import { ACTIVITY_LOG_MODEL, ActivityLogSchema } from './activity-log.schema';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsTcpController } from './activity-logs.tcp.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: ACTIVITY_LOG_MODEL, schema: ActivityLogSchema }]), TcpModule],
  controllers: [ActivityLogsTcpController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
