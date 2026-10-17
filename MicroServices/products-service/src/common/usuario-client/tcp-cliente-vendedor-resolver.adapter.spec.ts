import { ServiceUnavailableException } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { UserRole } from '@agua/contracts';
import { TcpClienteVendedorResolverAdapter } from './tcp-cliente-vendedor-resolver.adapter';

describe('TcpClienteVendedorResolverAdapter', () => {
  const send = jest.fn();
  const resolver = new TcpClienteVendedorResolverAdapter({ send } as unknown as ClientProxy);

  beforeEach(() => send.mockReset());

  it('uses domain provider IDs, default first, and passes the cliente JWT subject', async () => {
    send.mockReturnValue(of({ providers: [{ id: 'seller-1' }, { id: 'seller-2' }], defaultVendedorId: 'seller-2' }));
    await expect(resolver.resolveVendedoresByClienteUserId('auth-client-1')).resolves.toEqual(['seller-2', 'seller-1']);
    expect(send).toHaveBeenCalledWith('clientes.providers', expect.objectContaining({
      user: expect.objectContaining({ sub: 'auth-client-1', role: UserRole.CLIENTE }),
    }));
  });

  it('allows an empty portfolio but rejects malformed provider identities', async () => {
    send.mockReturnValueOnce(of({ providers: [] })).mockReturnValueOnce(of({ providers: [{ vendedorId: 'auth-seller-1' }] }));
    await expect(resolver.resolveVendedoresByClienteUserId('client')).resolves.toEqual([]);
    await expect(resolver.resolveVendedoresByClienteUserId('client')).rejects.toThrow(ServiceUnavailableException);
  });
});
