import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TcpVendedorProfileResolverAdapter } from './tcp-vendedor-profile-resolver.adapter';
import { USUARIO_CLIENT } from './usuario-client.module';

const mockUsuarioClient = {
  send: jest.fn(),
};

describe('TcpVendedorProfileResolverAdapter', () => {
  let adapter: TcpVendedorProfileResolverAdapter;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TcpVendedorProfileResolverAdapter,
        { provide: USUARIO_CLIENT, useValue: mockUsuarioClient },
      ],
    }).compile();

    adapter = module.get(TcpVendedorProfileResolverAdapter);
  });

  it('llama al pattern vendedores.resolve_profile_id con role vendedor forzado', async () => {
    mockUsuarioClient.send.mockReturnValue(of({ vendedorId: 'vendedor-1' }));

    const result = await adapter.resolveVendedorIdByAuthUserId('auth-user-1');

    expect(result).toBe('vendedor-1');
    expect(mockUsuarioClient.send).toHaveBeenCalledWith(
      'vendedores.resolve_profile_id',
      expect.objectContaining({
        user: expect.objectContaining({ sub: 'auth-user-1', role: 'vendedor' }),
      }),
    );
  });

  it('lanza NotFoundException si usuario-service no devuelve vendedorId', async () => {
    mockUsuarioClient.send.mockReturnValue(of(null));

    await expect(adapter.resolveVendedorIdByAuthUserId('auth-user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('propaga el error si el TCP call falla', async () => {
    mockUsuarioClient.send.mockReturnValue(throwError(() => new Error('TCP down')));

    await expect(adapter.resolveVendedorIdByAuthUserId('auth-user-1')).rejects.toThrow('TCP down');
  });

  it('llama al pattern activo para resolver vendedor activo', async () => {
    mockUsuarioClient.send.mockReturnValue(of({ vendedorId: 'vendedor-1' }));

    const result = await adapter.resolveActiveVendedorIdByAuthUserId('auth-user-1');

    expect(result).toBe('vendedor-1');
    expect(mockUsuarioClient.send).toHaveBeenCalledWith(
      'vendedores.resolve_active_profile_id',
      expect.objectContaining({
        user: expect.objectContaining({ sub: 'auth-user-1', role: 'vendedor' }),
      }),
    );
  });
});
