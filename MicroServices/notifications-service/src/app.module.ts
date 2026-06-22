import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URL || 'mongodb://localhost:27017/agua_notifications'),
    ActivityLogsModule,
    HealthModule,
  ],
})
export class AppModule {}
