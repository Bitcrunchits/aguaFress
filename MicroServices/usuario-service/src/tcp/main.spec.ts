import { getTcpPort } from '../main';

describe('getTcpPort', () => {
  const originalTcpPort = process.env.TCP_PORT;
  const originalPort = process.env.PORT;

  afterEach(() => {
    if (originalTcpPort === undefined) {
      delete process.env.TCP_PORT;
    } else {
      process.env.TCP_PORT = originalTcpPort;
    }

    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  });

  it('defaults TCP to 3011 without falling back to PORT', () => {
    delete process.env.TCP_PORT;
    process.env.PORT = '3001';

    expect(getTcpPort()).toBe(3011);
  });

  it('uses TCP_PORT when provided', () => {
    process.env.TCP_PORT = '4011';
    process.env.PORT = '3001';

    expect(getTcpPort()).toBe(4011);
  });
});
