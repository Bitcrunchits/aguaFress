import { HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { RpcExceptionFilter } from './rpc-exception.filter';

describe('RpcExceptionFilter', () => {
  let filter: RpcExceptionFilter;

  beforeEach(() => {
    filter = new RpcExceptionFilter();
  });

  describe('RPC context', () => {
    function mockRpcHost() {
      return {
        getType: () => 'rpc' as const,
        switchToRpc: () => ({
          getData: () => ({}),
          getContext: () => ({}),
        }),
      } as any;
    }

    it('convierte BadRequestException a RpcException con mensaje', (done) => {
      const httpErr = new HttpException('Email es requerido', HttpStatus.BAD_REQUEST);
      const host = mockRpcHost();

      const result = filter.catch(httpErr, host) as Observable<any>;

      result.subscribe({
        error: (err: RpcException) => {
          expect(err.getError()).toEqual({
            statusCode: 400,
            message: 'Email es requerido',
          });
          done();
        },
      });
    });

    it('convierte ConflictException a RpcException con mensaje', (done) => {
      const httpErr = new HttpException('El email ya está registrado', HttpStatus.CONFLICT);
      const host = mockRpcHost();

      const result = filter.catch(httpErr, host) as Observable<any>;

      result.subscribe({
        error: (err: RpcException) => {
          expect(err.getError()).toEqual({
            statusCode: 409,
            message: 'El email ya está registrado',
          });
          done();
        },
      });
    });

    it('convierte error generico a Internal server error', (done) => {
      const error = new Error('Algo exploto');
      const host = mockRpcHost();

      const result = filter.catch(error, host) as Observable<any>;

      result.subscribe({
        error: (err: RpcException) => {
          expect(err.getError()).toEqual({
            statusCode: 500,
            message: 'Internal server error',
          });
          done();
        },
      });
    });

    it('pasa RpcException directamente', (done) => {
      const rpcErr = new RpcException('Error custom');
      const host = mockRpcHost();

      const result = filter.catch(rpcErr, host) as Observable<any>;

      result.subscribe({
        error: (err: RpcException) => {
          expect(err).toBe(rpcErr);
          done();
        },
      });
    });
  });

  describe('HTTP context', () => {
    it('maneja HttpException y responde con JSON', () => {
      const httpErr = new HttpException('No encontrado', HttpStatus.NOT_FOUND);
      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const host = {
        getType: () => 'http' as const,
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock }),
        }),
      } as any;

      filter.catch(httpErr, host);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'No encontrado',
        }),
      );
    });
  });
});
