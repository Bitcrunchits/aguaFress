import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { bootstrap } from './main';

jest.mock('@nestjs/core', () => ({
  NestFactory: { createMicroservice: jest.fn() },
}));

describe('notifications-service bootstrap', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    process.env.TCP_PORT = '3016';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.TCP_PORT;
  });

  it('starts only a TCP microservice on TCP_PORT', async () => {
    const listen = jest.fn().mockResolvedValue(undefined);
    const createMicroservice = NestFactory.createMicroservice as unknown as jest.Mock<Promise<MicroserviceAppMock>, [unknown, unknown]>;
    createMicroservice.mockResolvedValue({ listen });

    await bootstrap();

    expect(NestFactory.createMicroservice).toHaveBeenCalledWith(AppModule, {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3016 },
    });
    expect(listen).toHaveBeenCalledTimes(1);
    expect(NestFactory).not.toHaveProperty('create');
  });
});

interface MicroserviceAppMock {
  readonly listen: jest.Mock<Promise<void>, []>;
}
