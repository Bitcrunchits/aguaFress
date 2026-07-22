import { getTcpPort } from './env.config';

describe('getTcpPort', () => {
  it('defaults TCP_PORT to 3014', () => {
    expect(getTcpPort(undefined)).toBe(3014);
    expect(getTcpPort('')).toBe(3014);
  });

  it('uses a valid TCP_PORT value', () => {
    expect(getTcpPort('4014')).toBe(4014);
  });

  it('rejects invalid TCP_PORT values', () => {
    expect(() => getTcpPort('abc')).toThrow('TCP_PORT must be an integer between 1 and 65535');
    expect(() => getTcpPort('0')).toThrow('TCP_PORT must be an integer between 1 and 65535');
    expect(() => getTcpPort('65536')).toThrow('TCP_PORT must be an integer between 1 and 65535');
  });
});
