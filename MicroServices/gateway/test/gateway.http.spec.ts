import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import request from 'supertest';
import type { UserRole } from '@agua/contracts';
import { TcpDispatcherService } from '../src/tcp/tcp-dispatcher.service';

describe('Gateway HTTP routing', () => {
  let app: INestApplication;
  let authToken: string;
  let mockDispatch: jest.Mock;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.USUARIO_SERVICE_HOST = 'usuario-service';
    process.env.USUARIO_SERVICE_TCP_PORT = '3001';

    mockDispatch = jest.fn();

    const { AppModule } = await import('../src/app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TcpDispatcherService)
      .useValue({ dispatch: mockDispatch })
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
    authToken = jwtService.sign({
      sub: 'test-user-id',
      email: 'test@agua.com',
      role: 'vendedor' as UserRole,
    });
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  beforeEach(() => {
    mockDispatch.mockReset();
  });

  it('serves GET /api/health publicly with sanitized output', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
    });
  });

  it('rejects unauthenticated requests to protected routes with 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/login').expect(401);
  });

  it('rejects invalid JWT with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('resolves mapped actions and dispatches via TCP', async () => {
    mockDispatch.mockResolvedValue({ token: 'jwt-token', user: { id: 'u1' } });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@agua.com', password: 'secret' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual({ token: 'jwt-token', user: { id: 'u1' } });
    expect(mockDispatch).toHaveBeenCalledWith(
      'auth',
      expect.objectContaining({
        body: { email: 'test@agua.com', password: 'secret' },
        params: { service: 'auth', action: 'login' },
        user: expect.objectContaining({ sub: 'test-user-id', email: 'test@agua.com', role: 'vendedor' }),
      }),
      expect.objectContaining({ tcpPattern: 'auth.login' }),
    );
  });

  it('accepts canonical GET, POST, PATCH, DELETE with auth', async () => {
    mockDispatch.mockResolvedValue({ ok: true });

    const server = app.getHttpServer();
    const authHeader = { Authorization: `Bearer ${authToken}` };

    await request(server).get('/api/v1/users/profile').set(authHeader).expect(200);
    await request(server).post('/api/v1/auth/login').set(authHeader).send({}).expect(200);
    await request(server).patch('/api/v1/users/profile/update').set(authHeader).send({}).expect(200);
    await request(server).delete('/api/v1/auth/logout').set(authHeader).expect(200);

    expect(mockDispatch).toHaveBeenCalledTimes(4);
  });

  it('returns 405 for PUT, HEAD, OPTIONS even with valid auth', async () => {
    const server = app.getHttpServer();
    const authHeader = { Authorization: `Bearer ${authToken}` };

    await request(server).put('/api/v1/auth/login').set(authHeader).expect(405);
    await request(server).head('/api/v1/auth/login').set(authHeader).expect(405);
    await request(server).options('/api/v1/auth/login').set(authHeader).expect(405);

    // Dispatcher should NOT have been called for these methods
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown actions', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/nonexistent')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('returns 503 for unavailable service families', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products/list')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(503);
  });

  it('returns 404 for unknown service families', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/foobar/test')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('rejects legacy paths without /v1/ prefix', async () => {
    const authHeader = { Authorization: `Bearer ${authToken}` };

    // Old-style /api/auth/login (no version prefix) should not route
    await request(app.getHttpServer()).post('/api/auth/login').set(authHeader).expect(404);
    await request(app.getHttpServer()).get('/api/users/profile').set(authHeader).expect(404);
  });

  it('resolves nested action paths like register/vendedor', async () => {
    mockDispatch.mockResolvedValue({ ok: true });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register/vendedor')
      .send({ email: 'vendedor@test.com', password: 'secret' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(mockDispatch).toHaveBeenCalledWith(
      'auth',
      expect.objectContaining({
        body: { email: 'vendedor@test.com', password: 'secret' },
        params: { service: 'auth', action: 'register/vendedor' },
      }),
      expect.objectContaining({ tcpPattern: 'auth.register_vendedor' }),
    );
  });

  it('rejects oversized payload beyond the limit', async () => {
    const oversizedBody = { data: 'x'.repeat(2 * 1024 * 1024) }; // ~2mb

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(oversizedBody)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(413);
  });
});
