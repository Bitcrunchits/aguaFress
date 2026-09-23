import { OpenApiSpecService } from '../src/docs/openapi-spec.service';

describe('OpenApiSpecService provider context docs', () => {
  it('documents a Scalar-friendly quick start, envelopes, and safe local seeds', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const description = (spec.info as { description: string }).description;

    expect(description).toContain('Inicio rápido en Scalar');
    expect(description).toContain('POST /api/v1/auth/login');
    expect(description).toContain('GET /api/v1/users/profile');
    expect(description).toContain('bearerAuth');
    expect(description).toContain('{ data, pagination }');
    expect(description).toContain('docker/init-db/*.sql');
    expect(description).toContain('admin@aguafress.com');
    expect(description).toContain('admin123');
  });

  it('uses bearerAuth as the OpenAPI JWT security scheme', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const components = spec.components as {
      securitySchemes: Record<string, unknown>;
    };

    expect(components.securitySchemes.bearerAuth).toEqual(expect.objectContaining({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    }));
  });

  it('documents safe vendor register response message', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const schemas = (spec.components as { schemas: Record<string, unknown> }).schemas;

    expect(schemas.RegisterResponse).toEqual(
      expect.objectContaining({
        required: expect.arrayContaining(['status', 'vendedorId', 'message']),
        properties: expect.objectContaining({
          message: expect.objectContaining({ type: 'string' }),
        }),
      }),
    );
  });

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
