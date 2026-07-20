import { getMongoUri, getTcpPort } from './env.config';

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
});
