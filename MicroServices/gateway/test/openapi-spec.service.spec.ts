import { ACTION_REGISTRY } from '../src/actions/action-registry';
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

interface SpecParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
}

interface SpecMediaType {
  schema?: { $ref?: string };
  example?: unknown;
}

interface SpecRequestBody {
  required?: boolean;
  content: Record<string, SpecMediaType>;
}

interface SpecOperation {
  summary?: string;
  description?: string;
  parameters?: SpecParameter[];
  requestBody?: SpecRequestBody;
  responses?: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }>;
}

interface SpecSchema {
  required?: string[];
}

const HTTP_METHODS = ['get', 'post', 'patch', 'delete'] as const;

function generateSpec() {
  return new OpenApiSpecService().generateSpec();
}

function specSchemas(spec: Record<string, unknown>): Record<string, SpecSchema> {
  return (spec.components as { schemas: Record<string, SpecSchema> }).schemas;
}

function specOperations(spec: Record<string, unknown>): { path: string; method: string; operation: SpecOperation }[] {
  const paths = spec.paths as Record<string, Record<string, SpecOperation>>;
  return Object.entries(paths).flatMap(([path, byMethod]) =>
    Object.entries(byMethod)
      .filter(([method]) => (HTTP_METHODS as readonly string[]).includes(method))
      .map(([method, operation]) => ({ path, method, operation })),
  );
}

function operationAt(spec: Record<string, unknown>, path: string, method: string): SpecOperation {
  const byMethod = (spec.paths as Record<string, Record<string, SpecOperation>>)[path];
  const operation = byMethod?.[method];
  if (!operation) {
    throw new Error(`Expected ${method.toUpperCase()} ${path} in the generated spec`);
  }

  return operation;
}

function responseSchemaRef(operation: SpecOperation): string | undefined {
  return operation.responses?.['200']?.content?.['application/json']?.schema?.$ref;
}

function schemaNameFromRef(ref: string | undefined): string | undefined {
  return ref?.split('/').pop();
}

function parameterOf(operation: SpecOperation, name: string): SpecParameter {
  const parameter = operation.parameters?.find(candidate => candidate.name === name);
  if (!parameter) {
    throw new Error(`Expected parameter "${name}" on ${operation.summary ?? 'operation'}`);
  }

  return parameter;
}

function bodyExampleOf(operation: SpecOperation): unknown {
  return operation.requestBody?.content['application/json']?.example;
}

describe('OpenApiSpecService order lifecycle documentation', () => {
  it('documents every orders action declared in the action registry', () => {
    const spec = generateSpec();
    const orderActions = Object.keys(ACTION_REGISTRY.orders.actions);
    const paths = spec.paths as Record<string, Record<string, unknown>>;

    expect(orderActions).toEqual(
      expect.arrayContaining(['list', 'get-by-id', 'status/update', 'cancel', 'confirm']),
    );
    expect(orderActions.filter(actionName => paths[`/api/v1/orders/${actionName}`] === undefined))
      .toEqual([]);
  });

  it('gives the five previously missing order actions a documented response schema', () => {
    const spec = generateSpec();
    const schemas = specSchemas(spec);

    expect(responseSchemaRef(operationAt(spec, '/api/v1/orders/list', 'get')))
      .toBeUndefined(); // array response, no $ref at the top level
    expect(responseSchemaRef(operationAt(spec, '/api/v1/orders/get-by-id', 'get')))
      .toBe('#/components/schemas/OrderResponse');
    expect(responseSchemaRef(operationAt(spec, '/api/v1/orders/status/update', 'patch')))
      .toBe('#/components/schemas/OrderResponse');
    expect(responseSchemaRef(operationAt(spec, '/api/v1/orders/cancel', 'patch')))
      .toBe('#/components/schemas/OrderResponse');
    expect(responseSchemaRef(operationAt(spec, '/api/v1/orders/confirm', 'patch')))
      .toBe('#/components/schemas/OrderResponse');

    expect(schemas.OrderResponse.required).toEqual(
      expect.arrayContaining(['id', 'pedidoNumero', 'clienteId', 'vendedorId', 'estado']),
    );
  });

  it('models OrderResponse with the fields orders-service actually returns', () => {
    const spec = generateSpec();
    const schemas = (spec.components as {
      schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }>;
    }).schemas;
    const orderResponse = schemas.OrderResponse;

    expect(Object.keys(orderResponse.properties ?? {}).sort()).toEqual([
      'clienteId', 'createdAt', 'direccion', 'estado', 'id', 'items', 'iva',
      'metodoPago', 'observaciones', 'pedidoNumero', 'total', 'totalSinIva',
      'updatedAt', 'vendedorId',
    ]);
    expect(orderResponse.required).toEqual(expect.arrayContaining([
      'id', 'pedidoNumero', 'clienteId', 'vendedorId', 'items', 'totalSinIva',
      'iva', 'total', 'estado', 'metodoPago', 'direccion', 'createdAt', 'updatedAt',
    ]));
    expect(orderResponse.required).not.toContain('observaciones');
  });

  it('documents orders list as scoped by role with no filters', () => {
    const spec = generateSpec();
    const list = operationAt(spec, '/api/v1/orders/list', 'get');

    expect(list.parameters).toBeUndefined();
    expect(list.description).toContain('cliente');
    expect(list.description).toContain('vendedor');
    expect(list.description).toContain('super_admin');
  });

  it('separates the order id from the async tracking id on job-status', () => {
    const spec = generateSpec();
    const jobStatus = operationAt(spec, '/api/v1/orders/job-status', 'get');

    expect(responseSchemaRef(jobStatus)).toBe('#/components/schemas/OrderJobStatusResponse');
    expect(parameterOf(jobStatus, 'id').description).toContain('trackingId');
    expect(parameterOf(jobStatus, 'id').description).toContain('NO el `id` del pedido');
  });
});

describe('OpenApiSpecService catalog soft delete documentation', () => {
  it('documents category and brand delete as a deactivation instead of a product deletion', () => {
    const spec = generateSpec();

    expect(responseSchemaRef(operationAt(spec, '/api/v1/categories/delete', 'delete')))
      .toBe('#/components/schemas/DeactivatedResponse');
    expect(responseSchemaRef(operationAt(spec, '/api/v1/brands/delete', 'delete')))
      .toBe('#/components/schemas/DeactivatedResponse');
    expect(responseSchemaRef(operationAt(spec, '/api/v1/products/delete', 'delete')))
      .toBe('#/components/schemas/ProductDeletedResponse');
  });

  it('declares the deactivated response shape returned by products-service', () => {
    const spec = generateSpec();
    const schemas = (spec.components as { schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }> }).schemas;

    expect(schemas.DeactivatedResponse.required).toEqual(['deactivated']);
    expect(Object.keys(schemas.DeactivatedResponse.properties ?? {})).toEqual(['deactivated']);
  });

  it('states the soft delete semantics and drops the false product-nulling claim', () => {
    const spec = generateSpec();

    for (const [path, method] of [['/api/v1/categories/delete', 'delete'], ['/api/v1/brands/delete', 'delete']] as const) {
      const operation = operationAt(spec, path, method);

      expect(operation.summary).toContain('Desactivar');
      expect(operation.description).toContain('activo: false');
      expect(operation.description).toContain('deactivated');
      expect(operation.description).not.toMatch(/pasan a null/i);
    }
  });
});

describe('OpenApiSpecService parameter provenance', () => {
  it('never renders the "Filtro por <param>" placeholder', () => {
    const placeholders = specOperations(generateSpec()).flatMap(({ path, method, operation }) =>
      (operation.parameters ?? [])
        .filter(parameter => parameter.in === 'query')
        .filter(parameter => /^Filtro por /.test(parameter.description ?? ''))
        .map(parameter => `${method.toUpperCase()} ${path} ?${parameter.name}`),
    );

    expect(placeholders).toEqual([]);
  });

  it('gives every declared parameter a real description', () => {
    const undocumented = specOperations(generateSpec()).flatMap(({ path, method, operation }) =>
      (operation.parameters ?? [])
        .filter(parameter => (parameter.description ?? '').trim().length === 0)
        .map(parameter => `${method.toUpperCase()} ${path} (${parameter.in}) ${parameter.name}`),
    );

    expect(undocumented).toEqual([]);
  });

  it('stops reusing the generic "ID del recurso" text on path parameters', () => {
    const generic = specOperations(generateSpec()).flatMap(({ path, method, operation }) =>
      (operation.parameters ?? [])
        .filter(parameter => parameter.in === 'path' && parameter.description === 'ID del recurso')
        .map(parameter => `${method.toUpperCase()} ${path}`),
    );

    expect(generic).toEqual([]);
  });

  it('tells catalog callers that vendedorId is a profile id, not the JWT sub', () => {
    const spec = generateSpec();

    for (const path of ['/api/v1/categories/list', '/api/v1/brands/list', '/api/v1/cart/get']) {
      expect(parameterOf(operationAt(spec, path, 'get'), 'vendedorId').description)
        .toContain('No es el `sub` del JWT');
    }
  });

  it('tells callers that create/update/delete resolve vendedorId from the token', () => {
    const spec = generateSpec();
    const resolvedFromToken = [
      ['/api/v1/categories/create', 'post'],
      ['/api/v1/categories/update', 'patch'],
      ['/api/v1/categories/delete', 'delete'],
      ['/api/v1/brands/create', 'post'],
      ['/api/v1/brands/update', 'patch'],
      ['/api/v1/brands/delete', 'delete'],
    ] as const;

    for (const [path, method] of resolvedFromToken) {
      expect(operationAt(spec, path, method).description).toContain('se resuelve del JWT');
    }
  });

  it('points every entity id at the action that returns it', () => {
    const spec = generateSpec();
    const provenance: [string, string, string][] = [
      ['/api/v1/categories/update', 'patch', 'categories/create'],
      ['/api/v1/categories/delete', 'delete', 'categories/create'],
      ['/api/v1/brands/update', 'patch', 'brands/create'],
      ['/api/v1/brands/delete', 'delete', 'brands/create'],
      ['/api/v1/products/update', 'patch', 'products/create'],
      ['/api/v1/products/delete', 'delete', 'products/create'],
      ['/api/v1/orders/get-by-id', 'get', 'orders/list'],
    ];

    for (const [path, method, source] of provenance) {
      expect(parameterOf(operationAt(spec, path, method), 'id').description).toContain(source);
    }
  });

  it('explains the three-id model and the query-versus-path url rule in the api description', () => {
    const description = (generateSpec().info as { description: string }).description;

    expect(description).toContain('Los tres ids');
    expect(description).toContain('AUTH_USER.id');
    expect(description).toContain('VENDEDOR.id');
    expect(description).toContain('Regla de URL');
    expect(description).toContain('?id=<uuid>');
    expect(description).toContain('no son intercambiables');
  });
});

describe('OpenApiSpecService request body documentation', () => {
  const MUTATING_FAMILIES = ['/api/v1/products/', '/api/v1/categories/', '/api/v1/brands/', '/api/v1/orders/'];

  it('exposes a runnable example on every mutating catalog and order request body', () => {
    const withoutExample = specOperations(generateSpec())
      .filter(({ path }) => MUTATING_FAMILIES.some(prefix => path.startsWith(prefix)))
      .filter(({ operation }) => operation.requestBody !== undefined)
      .filter(({ operation }) => bodyExampleOf(operation) === undefined)
      .map(({ path, method }) => `${method.toUpperCase()} ${path}`);

    expect(withoutExample).toEqual([]);
  });

  it('ships examples that match the documented request schemas', () => {
    const spec = generateSpec();

    expect(bodyExampleOf(operationAt(spec, '/api/v1/categories/create', 'post')))
      .toEqual({ nombre: 'Bidones' });
    expect(bodyExampleOf(operationAt(spec, '/api/v1/orders/cancel', 'patch')))
      .toEqual(expect.objectContaining({ motivo: expect.any(String) }));
    expect(bodyExampleOf(operationAt(spec, '/api/v1/orders/create', 'post')))
      .toEqual(expect.objectContaining({ metodoPago: 'contra_entrega' }));
  });

  it('derives requestBody.required from the referenced schema instead of hardcoding true', () => {
    const spec = generateSpec();
    const schemas = (spec.components as { schemas: Record<string, { required?: string[] }> }).schemas;

    const mismatches = specOperations(spec)
      .filter(({ operation }) => operation.requestBody !== undefined)
      .filter(({ operation }) => {
        const mediaType = operation.requestBody?.content['application/json'];
        const referenced = schemas[schemaNameFromRef(mediaType?.schema?.$ref) ?? ''];
        const schemaRequiresFields = (referenced?.required ?? []).length > 0;

        return operation.requestBody?.required !== schemaRequiresFields;
      })
      .map(({ path, method }) => `${method.toUpperCase()} ${path}`);

    expect(mismatches).toEqual([]);
  });

  it('marks a body required only when its schema declares required properties', () => {
    const spec = generateSpec();

    // CreateCategoriaRequest requires `nombre`; UpdateProfileRequest requires nothing.
    expect(operationAt(spec, '/api/v1/categories/create', 'post').requestBody?.required).toBe(true);
    expect(operationAt(spec, '/api/v1/users/profile/update', 'patch').requestBody?.required).toBe(false);
  });
});
