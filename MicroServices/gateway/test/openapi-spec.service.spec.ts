import { OpenApiSpecService } from '../src/docs/openapi-spec.service';

describe('OpenApiSpecService provider context docs', () => {
  it('documents cliente provider list and select gateway actions', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const paths = spec.paths as Record<string, Record<string, unknown>>;

    expect(paths['/api/v1/clientes/providers']?.get).toEqual(expect.objectContaining({
      summary: 'Listar proveedores disponibles del cliente',
    }));
    expect(paths['/api/v1/clientes/providers/select']?.post).toEqual(expect.objectContaining({
      summary: 'Seleccionar proveedor activo del cliente',
    }));
  });

  it('documents selected vendedorId as required provider scope for cart/order actions', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const schemas = (spec.components as { schemas: Record<string, unknown> }).schemas;

    expect(schemas.ClienteProvidersResponse).toEqual(expect.objectContaining({ type: 'object' }));
    expect(schemas.SelectClienteProviderRequest).toEqual(expect.objectContaining({ type: 'object' }));
    expect(paths['/api/v1/cart/get']?.get).toEqual(expect.objectContaining({
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: 'vendedorId', required: true }),
      ]),
    }));
    expect(paths['/api/v1/orders/create']?.post).toEqual(expect.objectContaining({
      description: expect.stringContaining('vendedorId'),
    }));
  });
});
