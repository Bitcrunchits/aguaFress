import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuditLogModule } from './audit-log.module';
import { PrismaService } from '../common/prisma/prisma.service';
import jwtConfig from '../common/config/env.config';

// ---------------------------------------------------------------------------
// Mock JwtStrategy — bypasses DB lookup, returns user from token payload
// ---------------------------------------------------------------------------
import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
class MockJwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    // Bypass DB — always return a valid user
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

// ---------------------------------------------------------------------------
// Integration tests for AuditLogAdminController
// ---------------------------------------------------------------------------
describe('AuditLogAdminController (integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const MOCK_USERS = {
    admin: { id: 'admin-user-1', email: 'admin@test.com', role: 'super_admin', is_active: true },
    vendedor: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor', is_active: true },
  };

  function createMockPrisma() {
    return {
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };
  }

  function signToken(sub: string, role: string, email = 'test@test.com'): string {
    return jwtService.sign({ sub, email, role });
  }

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-integration';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration';
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuditLogModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      providers: [MockJwtStrategy],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = module.createNestApplication();
    jwtService = module.get<JwtService>(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════
  //  200 — no filters
  // ═══════════════════════════════════════════════

  it('GET /admin/audit-logs — 200 with no filters returns paginated results', async () => {
    const mockRows = [
      {
        id: 'log-1',
        accion: 'USER_REGISTERED',
        usuario_id: 'user-1',
        target_id: null,
        detalle: null,
        ip: null,
        created_at: new Date(),
        actor: { email: 'user@test.com', role: 'cliente' },
      },
    ];
    mockPrisma.auditLog.findMany.mockResolvedValue(mockRows);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const token = signToken(MOCK_USERS.admin.id, MOCK_USERS.admin.role);

    const res = await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].usuarioEmail).toBe('user@test.com');
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  // ═══════════════════════════════════════════════
  //  200 — filtered + paginated
  // ═══════════════════════════════════════════════

  it('GET /admin/audit-logs — 200 with filters and pagination', async () => {
    // Create 50 rows to test pagination
    const mockRows = Array.from({ length: 10 }, (_, i) => ({
      id: `log-${i + 11}`,
      accion: 'USER_REGISTERED',
      usuario_id: 'user-1',
      target_id: null,
      detalle: null,
      ip: null,
      created_at: new Date(),
      actor: { email: 'user@test.com', role: 'cliente' },
    }));
    mockPrisma.auditLog.findMany.mockResolvedValue(mockRows);
    mockPrisma.auditLog.count.mockResolvedValue(50);

    const token = signToken(MOCK_USERS.admin.id, MOCK_USERS.admin.role);

    const res = await request(app.getHttpServer())
      .get('/admin/audit-logs?accion=USER_REGISTERED&limit=10&page=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 50,
      totalPages: 5,
    });
  });

  // ═══════════════════════════════════════════════
  //  401 — unauthenticated
  // ═══════════════════════════════════════════════

  it('GET /admin/audit-logs — 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .expect(401);
  });

  // ═══════════════════════════════════════════════
  //  403 — non-admin
  // ═══════════════════════════════════════════════

  it('GET /admin/audit-logs — 403 for non-admin role', async () => {
    const token = signToken(MOCK_USERS.vendedor.id, MOCK_USERS.vendedor.role);

    await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  // ═══════════════════════════════════════════════
  //  200 — empty result
  // ═══════════════════════════════════════════════

  it('GET /admin/audit-logs — 200 empty result with non-matching filter', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const token = signToken(MOCK_USERS.admin.id, MOCK_USERS.admin.role);

    const res = await request(app.getHttpServer())
      .get('/admin/audit-logs?usuarioId=22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });
});
