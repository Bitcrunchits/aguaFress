import { getMongoUri, getRedisStreamsConfig, getTcpPort } from './env.config';

describe('notifications env config', () => {
  it('uses local defaults for TCP port and Mongo URI', () => {
    expect(getTcpPort(undefined)).toBe(3016);
    expect(getMongoUri(undefined)).toBe('mongodb://localhost:27017/agua_notifications');
  });

  it('rejects invalid TCP_PORT and blank MONGODB_URI values', () => {
    expect(() => getTcpPort('0')).toThrow('TCP_PORT must be an integer between 1 and 65535');
    expect(() => getTcpPort('not-a-port')).toThrow('TCP_PORT must be an integer between 1 and 65535');
    expect(() => getMongoUri('   ')).toThrow('MONGODB_URI is required');
  });

  it('builds Redis Streams consumer config from explicit env values', () => {
    expect(getRedisStreamsConfig({
      REDIS_URL: 'redis://redis:6379',
      NOTIFICATIONS_STREAMS_ENABLED: 'true',
      NOTIFICATIONS_STREAM_NAMES: 'auth.events,orders.events',
      NOTIFICATIONS_STREAM_GROUP: 'notifications-service',
      NOTIFICATIONS_STREAM_CONSUMER: 'notifications-1',
    })).toEqual({
      enabled: true,
      redisUrl: 'redis://redis:6379',
      streamNames: ['auth.events', 'orders.events'],
      groupName: 'notifications-service',
      consumerName: 'notifications-1',
    });
  });

  it('keeps Redis Streams disabled by default and rejects incomplete enabled config', () => {
    expect(getRedisStreamsConfig({})).toEqual({
      enabled: false,
      redisUrl: 'redis://localhost:6379',
      streamNames: ['auth.events', 'user.events', 'products.events', 'orders.events', 'deliveries.events'],
      groupName: 'notifications-service',
      consumerName: 'notifications-service-1',
    });
    expect(() => getRedisStreamsConfig({ NOTIFICATIONS_STREAMS_ENABLED: 'true', NOTIFICATIONS_STREAM_NAMES: '   ' })).toThrow('NOTIFICATIONS_STREAM_NAMES is required when streams are enabled');
  });
});
