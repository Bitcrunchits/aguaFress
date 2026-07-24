import { Test, type TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { of, throwError, TimeoutError } from 'rxjs';
import { UsuarioVendedorProfileResolverAdapter } from './usuario-vendedor-profile-resolver.adapter';
import { USUARIO_SERVICE_CLIENT } from '../common/tokens';

const mockClient = {
  send: jest.fn(),
};

describe('UsuarioVendedorProfileResolverAdapter', () => {
  let adapter: UsuarioVendedorProfileResolverAdapter;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioVendedorProfileResolverAdapter,
        { provide: USUARIO_SERVICE_CLIENT, useValue: mockClient },
      ],
    }).compile();

    adapter = module.get<UsuarioVendedorProfileResolverAdapter>(UsuarioVendedorProfileResolverAdapter);
  });

  describe('resolveVendedorIdByAuthUserId', () => {
    it('retorna vendedorId cuando el usuario-service responde correctamente', async () => {
      mockClient.send.mockReturnValue(of({ vendedorId: 'abc-123' }));

      const result = await adapter.resolveVendedorIdByAuthUserId('auth-1');

      expect(result).toBe('abc-123');
      expect(mockClient.send).toHaveBeenCalledWith(
        'vendedores.resolve_profile_id',
        expect.objectContaining({
          user: expect.objectContaining({ sub: 'auth-1' }),
        }),
      );
    });

    it('lanza TimeoutError cuando el usuario-service no responde a tiempo', async () => {
      mockClient.send.mockReturnValue(throwError(() => new TimeoutError()));

      await expect(adapter.resolveVendedorIdByAuthUserId('auth-1')).rejects.toThrow(TimeoutError);
    });

    it('lanza ServiceUnavailableException cuando la respuesta no tiene vendedorId', async () => {
      mockClient.send.mockReturnValue(of({}));

      await expect(adapter.resolveVendedorIdByAuthUserId('auth-1')).rejects.toThrow(ServiceUnavailableException);
    });

    it('lanza ServiceUnavailableException cuando la respuesta es null', async () => {
      mockClient.send.mockReturnValue(of(null));

      await expect(adapter.resolveVendedorIdByAuthUserId('auth-1')).rejects.toThrow(ServiceUnavailableException);
    });

    it('lanza el error original cuando falla la conexion TCP', async () => {
      mockClient.send.mockReturnValue(throwError(() => new Error('Connection refused')));

      await expect(adapter.resolveVendedorIdByAuthUserId('auth-1')).rejects.toThrow('Connection refused');
    });
  });
});
