import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { CommonModule } from './common/common.module';
import { getMongoUri } from './common/config/env.config';

@Module({
  imports: [CommonModule, MongooseModule.forRoot(getMongoUri()), ActivityLogsModule],
})
export class AppModule {}
