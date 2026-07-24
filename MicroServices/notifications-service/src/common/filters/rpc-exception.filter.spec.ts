import { BadRequestException, HttpStatus, InternalServerErrorException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RpcExceptionFilter } from './rpc-exception.filter';

describe('RpcExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('normalizes HTTP validation exceptions into typed RPC error payloads with the message pattern path', async () => {
    const filter = new RpcExceptionFilter();
    const exception = new BadRequestException({ message: ['source must be valid'], error: 'Bad Request' });

    await expect(firstValueFrom(filter.catch(exception, argumentsHostWithPattern('activity_logs.create')))).rejects.toMatchObject({
      error: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['source must be valid'],
        error: 'Bad Request',
        timestamp: '2026-07-21T12:00:00.000Z',
        path: 'activity_logs.create',
      },
    });
    expect(Logger.prototype.warn).toHaveBeenCalledWith('RPC — source must be valid');
  });

  it('passes through existing RpcException instances without wrapping their payload', async () => {
    const filter = new RpcExceptionFilter();
    const exception = new RpcException({ statusCode: HttpStatus.CONFLICT, message: 'Duplicate requestId' });

    await expect(firstValueFrom(filter.catch(exception, argumentsHostWithPattern('activity_logs.create')))).rejects.toBe(exception);
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });

  it('hides unexpected exceptions behind an internal-server RPC payload and falls back to generic rpc path', async () => {
    const filter = new RpcExceptionFilter();

    await expect(firstValueFrom(filter.catch(new Error('database credentials leaked'), argumentsHostWithPattern('')))).rejects.toMatchObject({
      error: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: '2026-07-21T12:00:00.000Z',
        path: 'rpc',
      },
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith('RPC — Unhandled: database credentials leaked', expect.any(String));
  });

  it('logs server-side HTTP exceptions as errors while preserving their typed status', async () => {
    const filter = new RpcExceptionFilter();

    await expect(firstValueFrom(filter.catch(new InternalServerErrorException('Mongo unavailable'), argumentsHostWithPattern('activity_logs.create')))).rejects.toMatchObject({
      error: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Mongo unavailable',
        error: 'Internal Server Error',
        path: 'activity_logs.create',
      },
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith('RPC — Mongo unavailable', expect.any(String));
  });
});

function argumentsHostWithPattern(pattern: string): ArgumentsHost {
  const rpcHost = {
    getContext: <TContext = unknown>(): TContext => ({ getPattern: () => pattern }) as TContext,
    getData: <TData = unknown>(): TData => undefined as TData,
  };

  return {
    getArgByIndex: <T = unknown>(): T => undefined as T,
    getArgs: <T extends Array<unknown> = []>(): T => [] as unknown as T,
    getType: () => 'rpc',
    switchToHttp: () => ({
      getRequest: <T = unknown>(): T => undefined as T,
      getResponse: <T = unknown>(): T => undefined as T,
      getNext: <T = unknown>(): T => undefined as T,
    }),
    switchToRpc: () => rpcHost,
    switchToWs: () => ({
      getClient: <T = unknown>(): T => undefined as T,
      getData: <T = unknown>(): T => undefined as T,
      getPattern: (): string => pattern,
    }),
  } as unknown as ArgumentsHost;
}
