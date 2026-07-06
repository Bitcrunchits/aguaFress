import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { UserRole } from '@agua/contracts';

describe('Gateway HTTP foundation', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.USUARIO_SERVICE_HOST = 'usuario-service';
    process.env.USUARIO_SERVICE_TCP_PORT = '3001';
    const { AppModule } = await import('../src/app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Generate a valid JWT for authenticated requests
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

  it('serves GET /api/health publicly with sanitized output', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
    });
  });

  it('rejects unauthenticated requests to protected routes', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/login').expect(401);
  });

  it('serves the versioned /api/v1/:service/:action foundation surface with valid token', async () => {
    const server = app.getHttpServer();

    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual({
      service: 'auth',
      action: 'login',
      status: 'routing-not-implemented',
    });
  });

  it('accepts canonical GET, POST, PATCH, and DELETE action methods with auth', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/v1/users/profile').set('Authorization', `Bearer ${authToken}`).expect(200);
    await request(server).post('/api/v1/auth/login').set('Authorization', `Bearer ${authToken}`).expect(200);
    await request(server).patch('/api/v1/users/profile').set('Authorization', `Bearer ${authToken}`).expect(200);
    await request(server).delete('/api/v1/auth/session').set('Authorization', `Bearer ${authToken}`).expect(200);
  });

  it('returns controlled method errors for non-canonical action methods', async () => {
    const server = app.getHttpServer();
    const requestWithAuth = (method: 'put' | 'head' | 'options', url: string) =>
      request(server)[method](url).set('Authorization', `Bearer ${authToken}`);

    await requestWithAuth('put', '/api/v1/auth/login').expect(405);
    await requestWithAuth('head', '/api/v1/auth/login').expect(405);
    await requestWithAuth('options', '/api/v1/auth/login').expect(405);
  });

  it('rejects requests with invalid JWT token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
