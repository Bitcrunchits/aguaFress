import { RpcExceptionFilter } from './rpc-exception.filter';
import {
  HttpException,
  HttpStatus,
  type ArgumentsHost,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';

function createMockHttpAdapterHost() {
  const reply = jest.fn();
  const getRequestUrl = jest.fn().mockReturnValue('/api/test');

  const httpAdapterHost = {
    httpAdapter: { reply, getRequestUrl },
  } as unknown as HttpAdapterHost;

  return { httpAdapterHost, reply, getRequestUrl };
}

function createHttpHost(response: any): ArgumentsHost {
  return {
    getType: () => 'http' as const,
    switchToHttp: () => ({
      getRequest: () => ({ url: '/api/test' }),
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}

function createRpcHost(): ArgumentsHost {
  return {
    getType: () => 'rpc' as const,
  } as ArgumentsHost;
}

describe('RpcExceptionFilter', () => {
  let filter: RpcExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;
  let reply: jest.Mock;

  beforeEach(() => {
    const mock = createMockHttpAdapterHost();
    httpAdapterHost = mock.httpAdapterHost;
    reply = mock.reply;
    filter = new RpcExceptionFilter(httpAdapterHost);
  });

  // ── HTTP context ──────────────────────────────────────────

  describe('HTTP context', () => {
    function catchAndAssert(
      exception: unknown,
      expectedStatus: number,
      expectedBody: Record<string, any>,
    ) {
      filter.catch(exception, createHttpHost({}));

      expect(reply).toHaveBeenCalledTimes(1);
      const [, body, status] = reply.mock.calls[0];
      expect(status).toBe(expectedStatus);
      expect(body).toMatchObject(expectedBody);
      expect(typeof body.timestamp).toBe('string');

      return body;
    }

    it('devuelve JSON con statusCode, message, path y timestamp para HttpException', () => {
      const body = catchAndAssert(
        new HttpException('Not Found', 404),
        HttpStatus.NOT_FOUND,
        { message: 'Not Found', statusCode: 404, path: '/api/test' },
      );
    });

    it('devuelve 500 para errores no manejados sin error field', () => {
      const body = catchAndAssert(
        new Error('Algo explotó'),
        HttpStatus.INTERNAL_SERVER_ERROR,
        { statusCode: 500, message: 'Internal server error', path: '/api/test' },
      );
      expect(body.error).toBeUndefined();
    });

    it('preserva array de mensajes de ValidationPipe', () => {
      const body = catchAndAssert(
        new HttpException(
          { message: ['email must be an email', 'password too short'], error: 'Bad Request' },
          HttpStatus.BAD_REQUEST,
        ),
        HttpStatus.BAD_REQUEST,
        { message: ['email must be an email', 'password too short'], statusCode: 400, path: '/api/test' },
      );
    });
  });

  // ── RPC context ───────────────────────────────────────────

  describe('RPC context', () => {
    it('convierte HttpException a RpcException con el mismo código y mensaje', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      const host = createRpcHost();

      const result = filter.catch(exception, host) as any;

      return new Promise<void>((done) => {
        result.subscribe({
          error: (err: RpcException) => {
            const error = err.getError() as any;
            expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
            expect(error.message).toBe('Bad Request');
            done();
          },
        });
      });
    });

    it('pasa RpcException directamente', () => {
      const exception = new RpcException('Custom RPC error');
      const host = createRpcHost();

      const result = filter.catch(exception, host) as any;

      return new Promise<void>((done) => {
        result.subscribe({
          error: (err: RpcException) => {
            expect(err).toBe(exception);
            done();
          },
        });
      });
    });

    it('errores desconocidos devuelven 500 Internal server error', () => {
      const exception = new Error('Algo salió mal');
      const host = createRpcHost();

      const result = filter.catch(exception, host) as any;

      return new Promise<void>((done) => {
        result.subscribe({
          error: (err: RpcException) => {
            const error = err.getError() as any;
            expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(error.message).toBe('Internal server error');
            done();
          },
        });
      });
    });
  });
});
