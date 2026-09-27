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

  it('documents only credentials that exist in the local seed, never the conditional ones', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const description = (spec.info as { description: string }).description;

    // Real AUTH_USER rows in the local dev database.
    for (const email of ['admin@aguafress.com', 'vendedor@email.com', 'vendedor2@email.com', 'vendedor3@email.com']) {
      expect(description).toContain(email);
    }

    // seed-admin.sql creates these only when absent, so a database already
    // populated through the API never has them. Advertising them as login
    // credentials sends callers to a guaranteed 401. The prose below the
    // table may still name them to explain why they are absent.
    const credentialRows = description
      .split('\n')
      .filter(line => line.trimStart().startsWith('|') && line.includes('@'));

    expect(credentialRows.length).toBeGreaterThan(0);
    expect(credentialRows.join('\n')).not.toContain('juan@aguafress.com');
    expect(credentialRows.join('\n')).not.toContain('pedro@aguafress.com');
    expect(credentialRows.join('\n')).not.toContain('maria@aguafress.com');
  });

  it('keeps the documented seller credentials aligned with the login schema example', () => {
    const spec = new OpenApiSpecService().generateSpec();
    const schemas = (spec.components as { schemas: Record<string, { properties?: Record<string, { example?: unknown }> }> }).schemas;

    // LoginRequest.example.email is the credential the API is actually exercised with.
    const schemaExample = schemas.LoginRequest?.properties?.email?.example;

    expect(schemaExample).toBeDefined();
    expect((spec.info as { description: string }).description)
      .toContain(String(schemaExample));
  });

  it('maps each documented failure to its cause and remedy', () => {
    const description = (new OpenApiSpecService().generateSpec().info as { description: string }).description;

    expect(description).toContain('Errores frecuentes y qué significan');
    expect(description).toContain('id must be a UUID');
    expect(description).toContain('Idempotency key is required');
    expect(description).toContain('Invalid credentials');
    // The UUID version requirement is the least guessable part of the contract.
    expect(description).toContain('UUID v4');
  });

  it('tells the client recipe to create a client instead of promising a seeded one', () => {
    const description = (new OpenApiSpecService().generateSpec().info as { description: string }).description;
    const recipe = description.slice(description.indexOf('### Receta 4'));

    expect(recipe).toContain('No hay usuario cliente seed');
    expect(recipe).toContain('auth/register-client-by-vendor');
    expect(recipe).not.toContain('pedro@aguafress.com');
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
  it('documents every category and brand action declared in the registry', () => {
    const spec = generateSpec();
    const paths = spec.paths as Record<string, Record<string, unknown>>;

    expect(Object.keys(ACTION_REGISTRY.categories.actions)).toEqual(
      expect.arrayContaining(['list', 'list-inactive', 'create', 'update', 'delete', 'reactivate']),
    );
    expect(Object.keys(ACTION_REGISTRY.brands.actions)).toEqual(
      expect.arrayContaining(['list', 'create', 'update', 'delete', 'reactivate']),
    );
    expect(Object.keys(ACTION_REGISTRY.categories.actions).filter(actionName => paths[`/api/v1/categories/${actionName}`] === undefined))
      .toEqual([]);
    expect(Object.keys(ACTION_REGISTRY.brands.actions).filter(actionName => paths[`/api/v1/brands/${actionName}`] === undefined))
      .toEqual([]);
  });

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
      expect(operation.description).toContain('idempotente');
      expect(operation.description).not.toMatch(/pasan a null/i);
    }
  });

  it('documents category and brand reactivation as vendor-owned restore actions', () => {
    const spec = generateSpec();

    expect(responseSchemaRef(operationAt(spec, '/api/v1/categories/reactivate', 'patch')))
      .toBe('#/components/schemas/CategoriaResponse');
    expect(responseSchemaRef(operationAt(spec, '/api/v1/brands/reactivate', 'patch')))
      .toBe('#/components/schemas/MarcaResponse');
    expect(operationAt(spec, '/api/v1/categories/reactivate', 'patch').description)
      .toContain('conflicto');
  });

  it('documents inactive category audit as super-admin-only', () => {
    const spec = generateSpec();
    const operation = operationAt(spec, '/api/v1/categories/list-inactive', 'get');

    expect(responseSchemaRef(operation)).toBeUndefined();
    expect(operation.description).toContain('Solo `super_admin`');
    expect(operation.description).toContain('activo: false');
    expect(parameterOf(operation, 'vendedorId').required).toBe(false);
  });

  it('documents that normal catalog hides products linked to inactive taxonomy', () => {
    const spec = generateSpec();

    expect((spec.info as { description: string }).description).toContain('oculta productos vinculados');
    expect(operationAt(spec, '/api/v1/products/list', 'get').description).toContain('categorías o marcas inactivas');
    expect(operationAt(spec, '/api/v1/products/get', 'get').description).toContain('super_admin');
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

  it('marks role-dependent vendedorId query parameters as optional', () => {
    const spec = generateSpec();

    for (const path of ['/api/v1/categories/list', '/api/v1/brands/list', '/api/v1/products/list', '/api/v1/categories/list-inactive']) {
      expect(parameterOf(operationAt(spec, path, 'get'), 'vendedorId').required).toBe(false);
    }
  });

  it('tells callers that create/update/delete resolve vendedorId from the token', () => {
    const spec = generateSpec();
    const resolvedFromToken = [
      ['/api/v1/categories/create', 'post'],
      ['/api/v1/categories/update', 'patch'],
      ['/api/v1/categories/delete', 'delete'],
      ['/api/v1/categories/reactivate', 'patch'],
      ['/api/v1/brands/create', 'post'],
      ['/api/v1/brands/update', 'patch'],
      ['/api/v1/brands/delete', 'delete'],
      ['/api/v1/brands/reactivate', 'patch'],
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

describe('OpenApiSpecService required request headers', () => {
  it('exposes Idempotency-Key as a required header on orders.create', () => {
    const spec = generateSpec();
    const header = parameterOf(operationAt(spec, '/api/v1/orders/create', 'post'), 'Idempotency-Key');

    expect(header.in).toBe('header');
    expect(header.required).toBe(true);
    expect(header.description).toContain('Idempotency key is required');
    expect(header.description).toContain('qa-pedido-001');
  });

  it('gives every header parameter a location and a description', () => {
    const incomplete = specOperations(generateSpec())
      .flatMap(({ path, method, operation }) =>
        (operation.parameters ?? [])
          .filter(parameter => parameter.in === 'header')
          .filter(parameter => parameter.required !== true || !parameter.description)
          .map(parameter => `${method.toUpperCase()} ${path} ${parameter.name}`),
      );

    expect(incomplete).toEqual([]);
  });

  it('does not invent header parameters on actions that do not require them', () => {
    const withHeaders = specOperations(generateSpec())
      .filter(({ operation }) => (operation.parameters ?? []).some(parameter => parameter.in === 'header'))
      .map(({ path, method }) => `${method.toUpperCase()} ${path}`);

    expect(withHeaders).toEqual(['POST /api/v1/orders/create']);
  });

  it('states the idempotency requirement in the orders.create description too', () => {
    const operation = operationAt(generateSpec(), '/api/v1/orders/create', 'post');

    expect(operation.description).toContain('Idempotency-Key');
    expect(operation.description).toContain('202');
  });
});

describe('OpenApiSpecService Scalar walkthrough recipes', () => {
  it('ships step-by-step recipes covering login, catalog, and orders', () => {
    const description = (generateSpec().info as { description: string }).description;

    expect(description).toContain('Recetas para probar en Scalar');
    expect(description).toContain('Receta 1 — Vendedor: crear y desactivar una categoría');
    expect(description).toContain('Receta 4 — Cliente: crear un pedido y seguirlo');
  });

  it('warns about the two catalog mistakes that break the delete flow', () => {
    const description = (generateSpec().info as { description: string }).description;

    expect(description).toContain('/delete?id=<id>');
    expect(description).toContain('el servicio lo resuelve del token');
  });

  it('documents that job-status takes the trackingId, not the order id', () => {
    const spec = generateSpec();
    const description = (spec.info as { description: string }).description;

    expect(description).toContain('orders/job-status?id=<trackingId>');
    expect(parameterOf(operationAt(spec, '/api/v1/orders/job-status', 'get'), 'id').description)
      .toContain('trackingId');
  });
});
