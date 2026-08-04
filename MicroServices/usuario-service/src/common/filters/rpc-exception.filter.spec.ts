import { RpcExceptionFilter } from './rpc-exception.filter';
import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

function createRpcHost(): ArgumentsHost {
  return {
    getType: () => 'rpc' as const,
  } as ArgumentsHost;
}

describe('RpcExceptionFilter', () => {
  let filter: RpcExceptionFilter;

  beforeEach(() => {
    filter = new RpcExceptionFilter();
  });

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
