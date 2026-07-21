export interface RedisStreamMessage {
  readonly streamName: string;
  readonly id: string;
  readonly event: unknown;
}

export interface RedisStreamsClient {
  ensureGroup(streamName: string, groupName: string): Promise<void>;
  recoverPending(streamNames: readonly string[], groupName: string, consumerName: string): Promise<readonly RedisStreamMessage[]>;
  readGroup(streamNames: readonly string[], groupName: string, consumerName: string): Promise<readonly RedisStreamMessage[]>;
  ack(streamName: string, groupName: string, id: string): Promise<void>;
  disconnect(): Promise<void>;
}
