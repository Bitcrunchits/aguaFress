import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { RedisStreamsConfig } from '../common/config/env.config';
import { mapEventToActivityLogCreate } from './activity-log-event.mapper';
import type { RedisStreamsClient } from './redis-streams.client';

export const REDIS_STREAMS_CONFIG = Symbol('REDIS_STREAMS_CONFIG');
export const REDIS_STREAMS_CLIENT = Symbol('REDIS_STREAMS_CLIENT');
const POLL_INTERVAL_MS = 5_000;

@Injectable()
export class ActivityLogStreamsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityLogStreamsConsumer.name);
  private pollTimer: NodeJS.Timeout | undefined;
  private polling = false;

  constructor(
    @Inject(REDIS_STREAMS_CONFIG) private readonly config: RedisStreamsConfig,
    @Inject(REDIS_STREAMS_CLIENT) private readonly client: RedisStreamsClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) return;
    await this.pollOnce();
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, POLL_INTERVAL_MS);
    this.pollTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    await this.client.disconnect();
  }

  async pollOnce(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.polling) return;
    this.polling = true;
    try {
      await Promise.all(this.config.streamNames.map((streamName) => this.client.ensureGroup(streamName, this.config.groupName)));
      const pendingMessages = await this.client.recoverPending(this.config.streamNames, this.config.groupName, this.config.consumerName);
      const newMessages = await this.client.readGroup(this.config.streamNames, this.config.groupName, this.config.consumerName);
      const messages = [...pendingMessages, ...newMessages];

      for (const message of messages) {
        const createRequest = mapEventToActivityLogCreate(message.event, message.streamName, buildStreamDedupeEventId(message.streamName, message.id));
        if (createRequest !== undefined) {
          await this.activityLogsService.create(createRequest);
        } else {
          this.logger.warn(`Unsupported activity-log event skipped from ${message.streamName}`);
        }
        await this.client.ack(message.streamName, this.config.groupName, message.id);
      }
    } finally {
      this.polling = false;
    }
  }
}

function buildStreamDedupeEventId(streamName: string, messageId: string): string {
  return `${streamName}:${messageId}`;
}
