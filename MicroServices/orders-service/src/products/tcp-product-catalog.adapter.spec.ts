import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NEVER, of, throwError } from 'rxjs';
import { UserRole } from '@agua/contracts';
import { PRODUCT_CATALOG_TIMEOUT_MS } from './product-catalog.port';
import { TcpProductCatalogAdapter } from './tcp-product-catalog.adapter';

describe('TcpProductCatalogAdapter', () => {
  const user = { userId: 'auth-cliente-1', email: 'client@test.com', role: UserRole.CLIENTE };
  const snapshot = { id: 'product-1', vendedorId: 'domain-seller-1', nombre: 'Water', precioFinal: 1200, stock: 4, activo: true, mostrarPrecio: true };
  const client = { send: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
  let catalog: TcpProductCatalogAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    catalog = new TcpProductCatalogAdapter(client as unknown as ClientProxy);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the injected client to send only JWT identity in a scoped products.get query', async () => {
    client.send.mockReturnValue(of(snapshot));
    await expect(catalog.getScopedSnapshot('product-1', user)).resolves.toEqual(snapshot);
    expect(client.send).toHaveBeenCalledWith('products.get', {
      query: { id: 'product-1' }, body: {},
      user: { sub: 'auth-cliente-1', email: user.email, role: UserRole.CLIENTE },
      requestId: expect.any(String),
    });
    await catalog.onModuleDestroy();
    expect(client.close).toHaveBeenCalled();
  });

  it.each([
    [{ statusCode: 404, message: 'Producto no encontrado' }, NotFoundException],
    [{ statusCode: 400, message: 'Invalid query' }, BadRequestException],
    [{ statusCode: 403, message: 'Forbidden' }, ForbiddenException],
    [{ statusCode: 500, message: 'Internal error' }, ServiceUnavailableException],
    [new RpcException({ statusCode: 404, message: 'Producto no encontrado' }), NotFoundException],
    [{ error: { statusCode: 403, message: 'Forbidden' } }, ForbiddenException],
    [new Error('ECONNREFUSED'), ServiceUnavailableException],
  ])('maps TCP failure %p without leaking downstream details', async (error, exception) => {
    client.send.mockReturnValue(throwError(() => error));
    await expect(catalog.getScopedSnapshot('product-1', user)).rejects.toThrow(exception);
  });

  it.each([
    null, {}, { ...snapshot, id: 'different' }, { ...snapshot, mostrarPrecio: undefined },
    { ...snapshot, stock: -1 }, { ...snapshot, stock: 1.5 },
    { ...snapshot, precioFinal: '1200' }, { ...snapshot, precioFinal: NaN },
    { ...snapshot, vendedorId: '' }, { ...snapshot, activo: null },
  ])('rejects malformed or mismatched snapshots as unavailable', async (response) => {
    client.send.mockReturnValue(of(response));
    await expect(catalog.getScopedSnapshot('product-1', user)).rejects.toThrow(ServiceUnavailableException);
  });

  it('bounds a stalled TCP request before the gateway 5000ms deadline', async () => {
    jest.useFakeTimers();
    client.send.mockReturnValue(NEVER);
    const pending = catalog.getScopedSnapshot('product-1', user);
    const assertion = expect(pending).rejects.toThrow(ServiceUnavailableException);
    expect(PRODUCT_CATALOG_TIMEOUT_MS).toBeLessThan(5000);
    await jest.advanceTimersByTimeAsync(PRODUCT_CATALOG_TIMEOUT_MS);
    await assertion;
  });
});
