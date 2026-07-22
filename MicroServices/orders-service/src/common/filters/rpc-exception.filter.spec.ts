import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RpcExceptionFilter } from './rpc-exception.filter';

interface SerializedRpcError {
  readonly statusCode: number;
  readonly message: unknown;
  readonly error?: unknown;
  readonly timestamp?: unknown;
  readonly path?: unknown;
}

function createRpcHost(pattern = 'cart.items_add'): ArgumentsHost {
  return {
    getType: () => 'rpc' as const,
    switchToRpc: () => ({
      getContext: () => ({ getPattern: () => pattern }),
    }),
  } as ArgumentsHost;
}

function isRpcException(error: unknown): error is RpcException {
  return error instanceof RpcException;
}

function readSerializedError(error: RpcException): SerializedRpcError {
  const payload = error.getError();

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Expected RpcException object payload');
  }

  return payload as SerializedRpcError;
}

async function catchRpcError(exception: unknown): Promise<RpcException> {
  const filter = new RpcExceptionFilter();

  try {
    await lastValueFrom(filter.catch(exception, createRpcHost()));
  } catch (error: unknown) {
    if (isRpcException(error)) {
      return error;
    }
  }

  throw new Error('Expected filter to throw RpcException');
}

describe('RpcExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serializes UnauthorizedException with statusCode, message, timestamp and path', async () => {
    const error = await catchRpcError(
      new UnauthorizedException('Authenticated user is required'),
    );

    expect(readSerializedError(error)).toMatchObject({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Authenticated user is required',
      error: 'Unauthorized',
      path: 'cart.items_add',
    });
    expect(typeof readSerializedError(error).timestamp).toBe('string');
  });

  it('preserves validation message arrays from BadRequestException payloads', async () => {
    const error = await catchRpcError(
      new BadRequestException(['productId must be a UUID', 'quantity must be positive']),
    );

    expect(readSerializedError(error)).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: ['productId must be a UUID', 'quantity must be positive'],
      error: 'Bad Request',
      path: 'cart.items_add',
    });
  });

  it('preserves explicit HttpException response objects', async () => {
    const error = await catchRpcError(
      new HttpException(
        { message: 'Cart item not found', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      ),
    );

    expect(readSerializedError(error)).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Cart item not found',
      error: 'Bad Request',
    });
  });

  it('passes existing RpcException instances through unchanged', async () => {
    const filter = new RpcExceptionFilter();
    const rpcException = new RpcException('Custom RPC error');

    await expect(
      lastValueFrom(filter.catch(rpcException, createRpcHost())),
    ).rejects.toBe(rpcException);
  });

  it('serializes unknown exceptions as internal server errors', async () => {
    const error = await catchRpcError(new Error('database exploded'));

    expect(readSerializedError(error)).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      path: 'cart.items_add',
    });
  });
});
