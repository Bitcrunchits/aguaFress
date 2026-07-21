import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { getMongoUri } from './common/config/env.config';
import { StreamsModule } from './streams/streams.module';

@Module({
  imports: [MongooseModule.forRoot(getMongoUri()), ActivityLogsModule, StreamsModule],
})
export class AppModule {}
