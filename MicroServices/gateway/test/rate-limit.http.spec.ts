import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import request from 'supertest';
import { UserRole } from '@agua/contracts';
import { TcpDispatcherService } from '../src/tcp/tcp-dispatcher.service';

describe('Gateway rate limiting', () => {
  let app: INestApplication;
  let vendedorToken: string;
  let protectedRouteToken: string;
  let sharedIpFirstUserToken: string;
  let sharedIpSecondUserToken: string;
  let mockDispatch: jest.Mock;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.USUARIO_SERVICE_HOST = 'usuario-service';
    process.env.USUARIO_SERVICE_TCP_PORT = '3011';
    process.env.ORDERS_SERVICE_HOST = 'orders-service';
    process.env.ORDERS_SERVICE_TCP_PORT = '3014';
    process.env.NOTIFICATIONS_SERVICE_HOST = 'notifications-service';
    process.env.NOTIFICATIONS_SERVICE_TCP_PORT = '3016';
    process.env.RATE_LIMIT_AUTH_SENSITIVE_TTL_MS = '60000';
    process.env.RATE_LIMIT_AUTH_SENSITIVE_MAX = '2';
    process.env.RATE_LIMIT_TTL_MS = '60000';
    process.env.RATE_LIMIT_MAX = '3';
    process.env.RATE_LIMIT_PUBLIC_TTL_MS = '60000';
    process.env.RATE_LIMIT_PUBLIC_MAX = '10';

    mockDispatch = jest.fn().mockResolvedValue({ ok: true });

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
    vendedorToken = jwtService.sign({
      sub: 'rate-limit-user',
      email: 'rate-limit@agua.com',
      role: UserRole.VENDEDOR,
    });
    protectedRouteToken = jwtService.sign({
      sub: 'rate-limit-protected-user',
      email: 'rate-limit-protected@agua.com',
      role: UserRole.VENDEDOR,
    });
    sharedIpFirstUserToken = jwtService.sign({
      sub: 'rate-limit-shared-ip-first-user',
      email: 'rate-limit-shared-ip-first-user@agua.com',
      role: UserRole.VENDEDOR,
    });
    sharedIpSecondUserToken = jwtService.sign({
      sub: 'rate-limit-shared-ip-second-user',
      email: 'rate-limit-shared-ip-second-user@agua.com',
      role: UserRole.VENDEDOR,
    });
  });

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  it('applies a stricter budget to auth/login than authenticated actions', async () => {
    const server = app.getHttpServer();

    await request(server).post('/api/v1/auth/login').set('x-forwarded-for', '203.0.113.10').send({}).expect(200);
    await request(server).post('/api/v1/auth/login').set('x-forwarded-for', '203.0.113.10').send({}).expect(200);
    await request(server).post('/api/v1/auth/login').set('x-forwarded-for', '203.0.113.10').send({}).expect(429);

    await request(server)
      .get('/api/v1/users/profile')
      .set('x-forwarded-for', '203.0.113.10')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);
  });

  it('does not let clients bypass anonymous limits by spoofing x-forwarded-for', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/api/v1/auth/login')
      .set('x-forwarded-for', '198.51.100.1')
      .send({})
      .expect(200);
    await request(server)
      .post('/api/v1/auth/login')
      .set('x-forwarded-for', '198.51.100.2')
      .send({})
      .expect(200);
    await request(server)
      .post('/api/v1/auth/login')
      .set('x-forwarded-for', '198.51.100.3')
      .send({})
      .expect(429);
  });

  it('limits protected actions by decoded user and action key', async () => {
    const server = app.getHttpServer();
    const authHeader = { Authorization: `Bearer ${protectedRouteToken}` };

    await request(server).get('/api/v1/users/profile').set(authHeader).expect(200);
    await request(server).get('/api/v1/users/profile').set(authHeader).expect(200);
    await request(server).get('/api/v1/users/profile').set(authHeader).expect(200);
    await request(server).get('/api/v1/users/profile').set(authHeader).expect(429);

    await request(server).delete('/api/v1/auth/logout').set(authHeader).expect(200);
  });

  it('limits repeated protected-route requests with a missing bearer token', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/v1/users/profile').expect(401);
    await request(server).get('/api/v1/users/profile').expect(401);
    await request(server).get('/api/v1/users/profile').expect(401);
    await request(server).get('/api/v1/users/profile').expect(429);
  });

  it('limits repeated protected-route requests with an invalid bearer token', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/v1/users/profile').set('Authorization', 'Bearer invalid-token').expect(401);
    await request(server).get('/api/v1/users/profile').set('Authorization', 'Bearer invalid-token').expect(401);
    await request(server).get('/api/v1/users/profile').set('Authorization', 'Bearer invalid-token').expect(401);
    await request(server).get('/api/v1/users/profile').set('Authorization', 'Bearer invalid-token').expect(429);
  });

  it('prefers decoded user identity over IP for protected action keys', async () => {
    const server = app.getHttpServer();
    const sharedIp = '203.0.113.20';

    await request(server)
      .get('/api/v1/users/profile')
      .set('x-forwarded-for', sharedIp)
      .set('Authorization', `Bearer ${sharedIpFirstUserToken}`)
      .expect(200);
    await request(server)
      .get('/api/v1/users/profile')
      .set('x-forwarded-for', sharedIp)
      .set('Authorization', `Bearer ${sharedIpFirstUserToken}`)
      .expect(200);
    await request(server)
      .get('/api/v1/users/profile')
      .set('x-forwarded-for', sharedIp)
      .set('Authorization', `Bearer ${sharedIpFirstUserToken}`)
      .expect(200);
    await request(server)
      .get('/api/v1/users/profile')
      .set('x-forwarded-for', sharedIp)
      .set('Authorization', `Bearer ${sharedIpFirstUserToken}`)
      .expect(429);

    await request(server)
      .get('/api/v1/users/profile')
      .set('x-forwarded-for', sharedIp)
      .set('Authorization', `Bearer ${sharedIpSecondUserToken}`)
      .expect(200);
  });

  it('keeps health checks out of throttling', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/health').expect(200);
    await request(server).get('/api/health').expect(200);
    await request(server).get('/api/health').expect(200);
    await request(server).get('/api/health').expect(200);
    await request(server).get('/api/health').expect(200);
  });
});
