import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import request from 'supertest';
import { UserRole } from '@agua/contracts';
import { OrdersCreateQueueService } from '../src/queues/orders-create-queue.service';
import { DeliveriesQueueService } from '../src/queues/deliveries-queue.service';
import { TcpDispatcherService } from '../src/tcp/tcp-dispatcher.service';

describe('Gateway HTTP routing', () => {
  let app: INestApplication;
  let clienteToken: string;
  let vendedorToken: string;
  let superAdminToken: string;
  let mockDispatch: jest.Mock;
  let mockEnqueueOrderCreate: jest.Mock;
  let mockEnqueueDeliveryUpdate: jest.Mock;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.USUARIO_SERVICE_HOST = 'usuario-service';
    process.env.USUARIO_SERVICE_TCP_PORT = '3011';
    process.env.ORDERS_SERVICE_HOST = 'orders-service';
    process.env.ORDERS_SERVICE_TCP_PORT = '3014';
    process.env.NOTIFICATIONS_SERVICE_HOST = 'notifications-service';
    process.env.NOTIFICATIONS_SERVICE_TCP_PORT = '3016';
    process.env.ENTREGAS_SERVICE_HOST = 'entregas-service';
    process.env.ENTREGAS_SERVICE_TCP_PORT = '3015';
    process.env.PRODUCTS_SERVICE_HOST = 'products-service';
    process.env.PRODUCTS_SERVICE_TCP_PORT = '3013';

    mockDispatch = jest.fn();
    mockEnqueueOrderCreate = jest.fn();
    mockEnqueueDeliveryUpdate = jest.fn();

    const { AppModule } = await import('../src/app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TcpDispatcherService)
      .useValue({ dispatch: mockDispatch })
      .overrideProvider(OrdersCreateQueueService)
      .useValue({ enqueue: mockEnqueueOrderCreate })
      .overrideProvider(DeliveriesQueueService)
      .useValue({ enqueue: mockEnqueueDeliveryUpdate })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(json({ limit: '1mb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const jwtService = moduleRef.get(JwtService);
    clienteToken = jwtService.sign({
      sub: 'cliente-user-id',
      email: 'cliente@agua.com',
      role: UserRole.CLIENTE,
    });
    vendedorToken = jwtService.sign({
      sub: 'test-user-id',
      email: 'test@agua.com',
      role: UserRole.VENDEDOR,
    });
    superAdminToken = jwtService.sign({
      sub: 'admin-user-id',
      email: 'admin@agua.com',
      role: UserRole.SUPER_ADMIN,
    });
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  beforeEach(() => {
    mockDispatch.mockReset();
    mockEnqueueOrderCreate.mockReset();
    mockEnqueueDeliveryUpdate.mockReset();
  });

  it('serves GET /api/health publicly with sanitized output', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
    });
  });

  it('dispatches public auth/login without requiring a token', async () => {
    mockDispatch.mockResolvedValue({ token: 'jwt-token', user: { id: 'u1' } });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@agua.com', password: 'secret' })
      .expect(200);

    expect(response.body).toEqual({ token: 'jwt-token', user: { id: 'u1' } });
    expect(mockDispatch).toHaveBeenCalledWith(
      'auth',
      expect.objectContaining({
        body: { email: 'test@agua.com', password: 'secret' },
        params: { service: 'auth', action: 'login' },
        user: undefined,
      }),
      expect.objectContaining({ tcpPattern: 'auth.login' }),
    );
  });

  it('rejects unauthenticated requests to protected routes with 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/profile').expect(401);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('rejects invalid JWT with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches protected actions with the decoded user context', async () => {
    mockDispatch.mockResolvedValue({ id: 'test-user-id', email: 'test@agua.com' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(response.body).toEqual({ id: 'test-user-id', email: 'test@agua.com' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'users',
      expect.objectContaining({
        body: undefined,
        params: { service: 'users', action: 'profile' },
        user: expect.objectContaining({ sub: 'test-user-id', email: 'test@agua.com', role: 'vendedor' }),
      }),
      expect.objectContaining({ tcpPattern: 'users.profile' }),
    );
  });

  it('enforces roles from the action registry', async () => {
    mockDispatch.mockResolvedValue({ vendedores: [] });

    await request(app.getHttpServer())
      .get('/api/v1/vendedores/list')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);
    expect(mockDispatch).not.toHaveBeenCalled();

    const response = await request(app.getHttpServer())
      .get('/api/v1/vendedores/list')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(response.body).toEqual({ vendedores: [] });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('accepts canonical GET, POST, PATCH, DELETE with auth', async () => {
    mockDispatch.mockResolvedValue({ ok: true });

    const server = app.getHttpServer();
    const authHeader = { Authorization: `Bearer ${vendedorToken}` };

    await request(server).get('/api/v1/users/profile').set(authHeader).expect(200);
    await request(server).post('/api/v1/auth/login').send({}).expect(200);
    await request(server).patch('/api/v1/users/profile/update').set(authHeader).send({}).expect(200);
    await request(server).delete('/api/v1/auth/logout').set(authHeader).expect(200);

    expect(mockDispatch).toHaveBeenCalledTimes(4);
  });

  it('returns 405 for unsupported PUT, HEAD, and OPTIONS methods even with valid auth', async () => {
    const server = app.getHttpServer();
    const authHeader = { Authorization: `Bearer ${vendedorToken}` };

    await request(server).put('/api/v1/auth/login').set(authHeader).expect(405);
    await request(server).head('/api/v1/auth/login').set(authHeader).expect(405);
    await request(server).options('/api/v1/auth/login').set(authHeader).expect(405);

    // Dispatcher should NOT have been called for these methods
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown actions', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/nonexistent')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(404);
  });

  it('dispatches public products actions to products-service TCP patterns', async () => {
    mockDispatch.mockResolvedValue({ data: [] });

    const response = await request(app.getHttpServer())
      .post('/api/v1/products/list')
      .expect(200);

    expect(response.body).toEqual({ data: [] });
    expect(mockDispatch).toHaveBeenCalledWith(
      'products',
      expect.objectContaining({ params: { service: 'products', action: 'list' } }),
      expect.objectContaining({ tcpPattern: 'products.list', authRequired: false }),
    );
  });

  it('dispatches protected cart actions to orders-service TCP patterns', async () => {
    mockDispatch
      .mockResolvedValueOnce({ selectedProvider: { id: 'vendedor-1' } })
      .mockResolvedValueOnce({ cartId: 'cart-1', items: [] });

    const response = await request(app.getHttpServer())
      .get('/api/v1/cart/get?vendedorId=vendedor-1')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(200);

    expect(response.body).toEqual({ cartId: 'cart-1', items: [] });
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      'cart',
      expect.objectContaining({
        query: { vendedorId: 'vendedor-1' },
        params: { service: 'cart', action: 'get' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'cart.get', authRequired: true }),
    );
  });

  it('validates selected provider before cart GET and preserves vendedorId query context', async () => {
    mockDispatch
      .mockResolvedValueOnce({ selectedProvider: { id: 'vendedor-1', nombre: 'Vendor', isDefault: false } })
      .mockResolvedValueOnce({ cartId: 'cart-1', vendedorId: 'vendedor-1', items: [] });

    const response = await request(app.getHttpServer())
      .get('/api/v1/cart/get?vendedorId=vendedor-1')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(200);

    expect(response.body).toEqual({ cartId: 'cart-1', vendedorId: 'vendedor-1', items: [] });
    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      'clientes',
      expect.objectContaining({
        body: { vendedorId: 'vendedor-1' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'clientes.providers_select' }),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      'cart',
      expect.objectContaining({
        query: { vendedorId: 'vendedor-1' },
        params: { service: 'cart', action: 'get' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'cart.get', authRequired: true }),
    );
  });

  it('rejects unauthorized provider context before cart GET dispatch', async () => {
    mockDispatch.mockRejectedValueOnce({ statusCode: 403, message: 'Provider is not active for cliente' });

    await request(app.getHttpServer())
      .get('/api/v1/cart/get?vendedorId=vendedor-9')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(403);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      'clientes',
      expect.objectContaining({ body: { vendedorId: 'vendedor-9' } }),
      expect.objectContaining({ tcpPattern: 'clientes.providers_select' }),
    );
  });

  it('dispatches cliente provider list and select actions with trusted JWT context', async () => {
    mockDispatch
      .mockResolvedValueOnce({ providers: [{ id: 'vendedor-1', nombre: 'Vendor', isDefault: true }], requiresSelection: false })
      .mockResolvedValueOnce({ selectedProvider: { id: 'vendedor-1', nombre: 'Vendor', isDefault: true } });

    const server = app.getHttpServer();
    await request(server)
      .get('/api/v1/clientes/providers')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(200);

    await request(server)
      .post('/api/v1/clientes/providers/select')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ vendedorId: 'vendedor-1', userId: 'forged-user' })
      .expect(200);

    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      'clientes',
      expect.objectContaining({
        params: { service: 'clientes', action: 'providers' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'clientes.providers', authRequired: true, roles: ['cliente'] }),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      'clientes',
      expect.objectContaining({
        body: { vendedorId: 'vendedor-1' },
        params: { service: 'clientes', action: 'providers/select' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'clientes.providers_select', authRequired: true, roles: ['cliente'] }),
    );
  });

  it('validates selected provider before cart mutation and preserves vendedorId context', async () => {
    mockDispatch
      .mockResolvedValueOnce({ selectedProvider: { id: 'vendedor-1', nombre: 'Vendor', isDefault: false } })
      .mockResolvedValueOnce({ cartId: 'cart-1', vendedorId: 'vendedor-1' });

    await request(app.getHttpServer())
      .post('/api/v1/cart/items/add')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ vendedorId: 'vendedor-1', productoId: 'producto-1', cantidad: 2, userId: 'forged-user' })
      .expect(200);

    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      'clientes',
      expect.objectContaining({
        body: { vendedorId: 'vendedor-1' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'clientes.providers_select' }),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      'cart',
      expect.objectContaining({
        body: { vendedorId: 'vendedor-1', productoId: 'producto-1', cantidad: 2 },
        params: { service: 'cart', action: 'items/add' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'cart.items_add' }),
    );
  });

  it('rejects unauthorized provider context before cart mutation dispatch', async () => {
    mockDispatch.mockRejectedValueOnce({ statusCode: 403, message: 'Provider is not active for cliente' });

    await request(app.getHttpServer())
      .post('/api/v1/cart/items/add')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ vendedorId: 'vendedor-9', productoId: 'producto-1', cantidad: 2 })
      .expect(403);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      'clientes',
      expect.objectContaining({ body: { vendedorId: 'vendedor-9' } }),
      expect.objectContaining({ tcpPattern: 'clientes.providers_select' }),
    );
  });

  it('forwards sanitized DELETE body for cart item deletion', async () => {
    mockDispatch
      .mockResolvedValueOnce({ selectedProvider: { id: 'vendedor-1' } })
      .mockResolvedValueOnce({ cartId: 'cart-1', items: [] });

    await request(app.getHttpServer())
      .delete('/api/v1/cart/items/delete')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ vendedorId: 'vendedor-1', cartId: 'cart-1', productoId: 'producto-1', userId: 'forged-user' })
      .expect(200);

    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      'cart',
      expect.objectContaining({
        body: { vendedorId: 'vendedor-1', cartId: 'cart-1', productoId: 'producto-1' },
        params: { service: 'cart', action: 'items/delete' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'cart.items_delete', authRequired: true }),
    );
  });

  it('enqueues protected orders.create with 202 and ignores body userId as identity source', async () => {
    mockDispatch.mockResolvedValue({ selectedProvider: { id: 'vendedor-1', nombre: 'Vendor', isDefault: true } });
    mockEnqueueOrderCreate.mockResolvedValue({
      jobId: 'orders.create:cliente-user-id:http-key',
      trackingId: 'tracking-http',
      status: 'PENDING',
      statusUrl: '/api/v1/orders/job-status?id=tracking-http',
      acceptedAt: '2026-07-17T19:00:00.000Z',
      vendedorId: 'vendedor-1',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/create')
      .set('Idempotency-Key', 'http-key')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ userId: 'forged-user', vendedorId: 'vendedor-1', metodoPago: 'contra_entrega' })
      .expect(202);

    expect(response.body).toEqual(expect.objectContaining({
      jobId: 'orders.create:cliente-user-id:http-key',
      trackingId: 'tracking-http',
      status: 'PENDING',
      statusUrl: '/api/v1/orders/job-status?id=tracking-http',
      vendedorId: 'vendedor-1',
    }));
    expect(mockDispatch).toHaveBeenCalledWith(
      'clientes',
      expect.objectContaining({
        body: { vendedorId: 'vendedor-1' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'clientes.providers_select' }),
    );
    expect(mockEnqueueOrderCreate).toHaveBeenCalledWith(expect.objectContaining({
        body: { vendedorId: 'vendedor-1', metodoPago: 'contra_entrega' },
        clienteId: 'cliente-user-id',
        idempotencyKey: 'http-key',
        vendedorId: 'vendedor-1',
    }));
  });

  it('dispatches orders.job-status through TCP using the action-router shape', async () => {
    mockDispatch.mockResolvedValue({ trackingId: 'tracking-http', status: 'PENDING' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/orders/job-status?id=tracking-http')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(200);

    expect(response.body).toEqual({ trackingId: 'tracking-http', status: 'PENDING' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'orders',
      expect.objectContaining({
        query: { id: 'tracking-http' },
        params: { service: 'orders', action: 'job-status' },
        user: expect.objectContaining({ sub: 'cliente-user-id', role: 'cliente' }),
      }),
      expect.objectContaining({ tcpPattern: 'orders.job_status', authRequired: true }),
    );
    expect(mockEnqueueOrderCreate).not.toHaveBeenCalled();
  });

  it('dispatches activity-logs/list to notifications-service for SUPER_ADMIN only', async () => {
    mockDispatch.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

    await request(app.getHttpServer())
      .get('/api/v1/activity-logs/list?source=gateway&limit=20')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);
    expect(mockDispatch).not.toHaveBeenCalled();

    const response = await request(app.getHttpServer())
      .get('/api/v1/activity-logs/list?source=gateway&limit=20')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(response.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    expect(mockDispatch).toHaveBeenCalledWith(
      'activity-logs',
      expect.objectContaining({
        query: { source: 'gateway', limit: '20' },
        params: { service: 'activity-logs', action: 'list' },
        user: expect.objectContaining({ sub: 'admin-user-id', role: 'super_admin' }),
      }),
      expect.objectContaining({ tcpPattern: 'activity_logs.list', authRequired: true, roles: ['super_admin'] }),
    );
  });

  it('dispatches activity-logs/get-by-id and blocks unauthenticated calls before TCP', async () => {
    mockDispatch.mockResolvedValue({ id: '507f1f77bcf86cd799439011', summary: 'login ok' });

    await request(app.getHttpServer())
      .get('/api/v1/activity-logs/get-by-id?id=507f1f77bcf86cd799439011')
      .expect(401);
    expect(mockDispatch).not.toHaveBeenCalled();

    const response = await request(app.getHttpServer())
      .get('/api/v1/activity-logs/get-by-id?id=507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(response.body).toEqual({ id: '507f1f77bcf86cd799439011', summary: 'login ok' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'activity-logs',
      expect.objectContaining({
        query: { id: '507f1f77bcf86cd799439011' },
        params: { service: 'activity-logs', action: 'get-by-id' },
      }),
      expect.objectContaining({ tcpPattern: 'activity_logs.get-by-id', authRequired: true, roles: ['super_admin'] }),
    );
  });

  // ─── Deliveries ────────────────────────────────────────

  it('dispatches deliveries/list for vendedor only', async () => {
    mockDispatch.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });

    await request(app.getHttpServer())
      .get('/api/v1/deliveries/list')
      .expect(401);
    expect(mockDispatch).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .get('/api/v1/deliveries/list')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(403);
    expect(mockDispatch).not.toHaveBeenCalled();

    const response = await request(app.getHttpServer())
      .get('/api/v1/deliveries/list')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(response.body).toEqual({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    expect(mockDispatch).toHaveBeenCalledWith(
      'deliveries',
      expect.objectContaining({
        params: { service: 'deliveries', action: 'list' },
        user: expect.objectContaining({ sub: 'test-user-id', role: 'vendedor' }),
      }),
      expect.objectContaining({ tcpPattern: 'deliveries.list', authRequired: true, roles: ['vendedor'] }),
    );
  });

  it('dispatches deliveries/get for vendedor only', async () => {
    mockDispatch.mockResolvedValue({ id: 'del-1', orderId: 'order-1', estado: 'pendiente' });

    await request(app.getHttpServer())
      .get('/api/v1/deliveries/get?id=del-1')
      .expect(401);
    expect(mockDispatch).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .get('/api/v1/deliveries/get?id=del-1')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(403);
    expect(mockDispatch).not.toHaveBeenCalled();

    const response = await request(app.getHttpServer())
      .get('/api/v1/deliveries/get?id=del-1')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(response.body).toEqual({ id: 'del-1', orderId: 'order-1', estado: 'pendiente' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'deliveries',
      expect.objectContaining({
        query: { id: 'del-1' },
        params: { service: 'deliveries', action: 'get' },
        user: expect.objectContaining({ sub: 'test-user-id', role: 'vendedor' }),
      }),
      expect.objectContaining({ tcpPattern: 'deliveries.get', authRequired: true, roles: ['vendedor'] }),
    );
  });

  // ─── Deliveries Async Update-Status ────────────────────

  it('rejects deliveries/update-status without JWT with 401 before enqueue', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status?id=del-1')
      .send({ estado: 'EN_CAMINO' })
      .expect(401);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('rejects deliveries/update-status with wrong role (cliente) before enqueue', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status?id=del-1')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ estado: 'EN_CAMINO' })
      .expect(403);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('enqueues deliveries/update-status with 202 and Idempotency-Key header', async () => {
    mockEnqueueDeliveryUpdate.mockResolvedValue({
      jobId: 'deliveries.update_status:del-1:http-key',
      trackingId: 'tracking-del-http',
      status: 'PENDING',
      statusUrl: '/api/v1/deliveries/job-status?id=tracking-del-http',
      acceptedAt: '2026-07-22T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status?id=del-1')
      .set('Idempotency-Key', 'http-key')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ estado: 'EN_CAMINO', userId: 'forged-user' })
      .expect(202);

    expect(response.body).toEqual(expect.objectContaining({
      jobId: 'deliveries.update_status:del-1:http-key',
      trackingId: 'tracking-del-http',
      status: 'PENDING',
      statusUrl: '/api/v1/deliveries/job-status?id=tracking-del-http',
    }));
    expect(mockEnqueueDeliveryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      deliveryId: 'del-1',
      idempotencyKey: 'http-key',
    }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('enqueues deliveries/update-status with 202 and body idempotencyKey', async () => {
    mockEnqueueDeliveryUpdate.mockResolvedValue({
      jobId: 'deliveries.update_status:del-1:body-key',
      trackingId: 'tracking-del-body',
      status: 'PENDING',
      statusUrl: '/api/v1/deliveries/job-status?id=tracking-del-body',
      acceptedAt: '2026-07-22T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status?id=del-1')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ estado: 'EN_CAMINO', idempotencyKey: 'body-key' })
      .expect(202);

    expect(response.body).toEqual(expect.objectContaining({
      jobId: 'deliveries.update_status:del-1:body-key',
      trackingId: 'tracking-del-body',
      status: 'PENDING',
    }));
    expect(mockEnqueueDeliveryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      deliveryId: 'del-1',
      idempotencyKey: 'body-key',
    }));
  });

  it('rejects deliveries/update-status with 400 when idempotency key is missing', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status?id=del-1')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ estado: 'EN_CAMINO' })
      .expect(400);
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('rejects deliveries/update-status with 400 when header and body idempotency keys mismatch', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status?id=del-1')
      .set('Idempotency-Key', 'header-key')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ estado: 'EN_CAMINO', idempotencyKey: 'body-key' })
      .expect(400);
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('rejects deliveries/update-status with 400 when delivery id is missing', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/deliveries/update-status')
      .set('Idempotency-Key', 'key-1')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ estado: 'EN_CAMINO' })
      .expect(400);
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('keeps deliveries/list and deliveries/get on TCP when update-status is async', async () => {
    mockDispatch.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/deliveries/list')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);
    expect(listResponse.body).toEqual({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    expect(mockDispatch).toHaveBeenCalledWith(
      'deliveries',
      expect.objectContaining({ params: { service: 'deliveries', action: 'list' } }),
      expect.objectContaining({ tcpPattern: 'deliveries.list' }),
    );
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();

    mockDispatch.mockClear();
    mockDispatch.mockResolvedValue({ id: 'del-1', orderId: 'order-1', estado: 'pendiente' });

    const getResponse = await request(app.getHttpServer())
      .get('/api/v1/deliveries/get?id=del-1')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);
    expect(getResponse.body).toEqual({ id: 'del-1', orderId: 'order-1', estado: 'pendiente' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'deliveries',
      expect.objectContaining({ params: { service: 'deliveries', action: 'get' } }),
      expect.objectContaining({ tcpPattern: 'deliveries.get' }),
    );
    expect(mockEnqueueDeliveryUpdate).not.toHaveBeenCalled();
  });

  it('keeps audit-log reads on usuario-service and exposes no activity-log mutations', async () => {
    mockDispatch.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

    await request(app.getHttpServer())
      .get('/api/v1/super-admin/audit-log')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(mockDispatch).toHaveBeenCalledWith(
      'super-admin',
      expect.any(Object),
      expect.objectContaining({ tcpPattern: 'super_admin.audit_log' }),
    );

    mockDispatch.mockClear();
    await request(app.getHttpServer())
      .post('/api/v1/activity-logs/create')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ summary: 'forbidden' })
      .expect(404);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('rejects orders.create without idempotency before TCP fallback', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders/create')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ metodoPago: 'contra_entrega' })
      .expect(400);

    expect(mockEnqueueOrderCreate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('restricts order confirmation to vendedor lifecycle actors', async () => {
    mockDispatch.mockResolvedValue({ id: 'order-1', estado: 'confirmado' });

    await request(app.getHttpServer())
      .post('/api/v1/orders/confirm?id=order-1')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(403);
    expect(mockDispatch).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/api/v1/orders/confirm?id=order-1')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ userId: 'forged-user' })
      .expect(200);

    expect(mockDispatch).toHaveBeenCalledWith(
      'orders',
      expect.objectContaining({
        body: {},
        query: { id: 'order-1' },
        params: { service: 'orders', action: 'confirm' },
        user: expect.objectContaining({ sub: 'test-user-id', role: 'vendedor' }),
      }),
      expect.objectContaining({ tcpPattern: 'orders.confirm', authRequired: true, roles: ['vendedor'] }),
    );
  });

  it('rejects unauthenticated cart and order actions before TCP dispatch', async () => {
    await request(app.getHttpServer()).get('/api/v1/cart/get').expect(401);
    await request(app.getHttpServer()).post('/api/v1/orders/create').send({}).expect(401);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('returns a controlled 404 for unknown cart and order actions', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/unknown')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/orders/unknown')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(404);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown service families', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/foobar/test')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(404);
  });

  it('rejects legacy paths without /v1/ prefix', async () => {
    const authHeader = { Authorization: `Bearer ${vendedorToken}` };

    // Old-style /api/auth/login (no version prefix) should not route
    await request(app.getHttpServer()).post('/api/auth/login').set(authHeader).expect(404);
    await request(app.getHttpServer()).get('/api/users/profile').set(authHeader).expect(404);
  });

  it('dispatches public auth/register without requiring a token', async () => {
    mockDispatch.mockResolvedValue({ status: 'pendiente', vendedorId: 'v-123' });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'vendedor@test.com', password: 'secret', nombre: 'Test', telefono: '123456789' })
      .expect(200);

    expect(response.body).toEqual({ status: 'pendiente', vendedorId: 'v-123' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'auth',
      expect.objectContaining({
        body: { email: 'vendedor@test.com', password: 'secret', nombre: 'Test', telefono: '123456789' },
        params: { service: 'auth', action: 'register' },
        user: undefined,
      }),
      expect.objectContaining({ tcpPattern: 'auth.register' }),
    );
  });

  it('forwards query params and x-request-id', async () => {
    mockDispatch.mockResolvedValue({ ok: true });

    await request(app.getHttpServer())
      .get('/api/v1/users/profile?include=qr&expand=cliente')
      .set('x-request-id', 'request-123')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(mockDispatch).toHaveBeenCalledWith(
      'users',
      expect.objectContaining({
        query: { include: 'qr', expand: 'cliente' },
        requestId: 'request-123',
      }),
      expect.objectContaining({ tcpPattern: 'users.profile' }),
    );
  });

  it('forwards POST/PATCH/DELETE bodies but leaves GET body undefined', async () => {
    mockDispatch.mockResolvedValue({ ok: true });
    const server = app.getHttpServer();
    const authHeader = { Authorization: `Bearer ${vendedorToken}` };

    await request(server).post('/api/v1/auth/login').send({ email: 'a@b.com' }).expect(200);
    await request(server)
      .patch('/api/v1/users/profile/update')
      .set(authHeader)
      .send({ name: 'New Name' })
      .expect(200);
    await request(server).get('/api/v1/users/profile').set(authHeader).expect(200);
    await request(server).delete('/api/v1/auth/logout').set(authHeader).send({ reason: 'manual' }).expect(200);

    expect(mockDispatch.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ body: { email: 'a@b.com' } }));
    expect(mockDispatch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ body: { name: 'New Name' } }));
    expect(mockDispatch.mock.calls[2]?.[1]).toEqual(expect.objectContaining({ body: undefined }));
    expect(mockDispatch.mock.calls[3]?.[1]).toEqual(expect.objectContaining({ body: { reason: 'manual' } }));
  });

  it('rejects oversized payload beyond the limit', async () => {
    const oversizedBody = { data: 'x'.repeat(2 * 1024 * 1024) }; // ~2mb

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(oversizedBody)
      .expect(413);
  });
});
