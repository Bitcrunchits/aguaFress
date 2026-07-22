import { Module } from '@nestjs/common';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { getRedisStreamsConfig, type RedisStreamsConfig } from '../common/config/env.config';
import { ActivityLogStreamsConsumer, REDIS_STREAMS_CLIENT, REDIS_STREAMS_CONFIG } from './activity-log-streams.consumer';
import { IoredisStreamsClient } from './ioredis-streams.client';
import type { RedisStreamsClient } from './redis-streams.client';

const disabledRedisStreamsClient: RedisStreamsClient = {
  ensureGroup: async () => undefined,
  recoverPending: async () => [],
  readGroup: async () => [],
  ack: async () => undefined,
  disconnect: async () => undefined,
};

export function createRedisStreamsClient(config: RedisStreamsConfig): RedisStreamsClient {
  return config.enabled ? new IoredisStreamsClient(config.redisUrl) : disabledRedisStreamsClient;
}

@Module({
  imports: [ActivityLogsModule],
  providers: [
    { provide: REDIS_STREAMS_CONFIG, useFactory: getRedisStreamsConfig },
    {
      provide: REDIS_STREAMS_CLIENT,
      useFactory: createRedisStreamsClient,
      inject: [REDIS_STREAMS_CONFIG],
    },
    ActivityLogStreamsConsumer,
  ],
})
export class StreamsModule {}
