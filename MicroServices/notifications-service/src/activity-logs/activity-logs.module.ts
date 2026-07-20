import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ACTIVITY_LOG_MODEL, ActivityLogSchema } from './activity-log.schema';
import { ActivityLogsService } from './activity-logs.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ACTIVITY_LOG_MODEL, schema: ActivityLogSchema }])],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
