import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { LinkInvitacionModule } from './link-invitacion.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { UserRole, VendedorEstado } from '@agua/contracts';
import jwtConfig from '../common/config/env.config';

// ---------------------------------------------------------------------------
// Integration tests for LinkInvitacion: admin CRUD, vendor CRUD, guard chain
// ---------------------------------------------------------------------------
describe('LinkInvitacion Integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // Mock users returned by JwtStrategy.validate()
  const MOCK_USERS = {
    admin: { id: 'admin-1', email: 'admin@test.com', role: 'super_admin' as const, is_active: true },
    vendedor: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor' as const, is_active: true },
    cliente: { id: 'cliente-user-1', email: 'cliente@test.com', role: 'cliente' as const, is_active: true },
  };

  // Default vendedor record linked to the mock vendedor user
  const MOCK_VENDEDOR = {
    id: 'vendor-user-1',
    auth_user_id: 'vendor-user-1',
    nombre: 'Juan',
    apellido: 'Pérez',
    estado: VendedorEstado.ACTIVO,
    created_at: new Date(),
    updated_at: new Date(),
    auth_user: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor' },
  };

  function createMockPrisma() {
    return {
      authUser: { findUnique: jest.fn() },
      linkInvitacion: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      vendedor: {
        findUnique: jest.fn(),
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
        LinkInvitacionModule,
        ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(VendedorResolver)
      .useValue({ resolve: jest.fn().mockResolvedValue('vendor-user-1') })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    jwtService = module.get<JwtService>(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Vendor link flow: create → list → deactivate
  // ────────────────────────────────────────────────────────────────────────
  describe('Vendor LinkInvitacion CRUD flow', () => {
    let vendedorToken: string;

    beforeEach(() => {
      vendedorToken = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);
      mockPrisma.vendedor.findUnique.mockResolvedValue(MOCK_VENDEDOR);
    });

    it('completa ciclo: create link → list links → deactivate link', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // ── CREATE LINK ──
      const mockCreatedLink = {
        id: 'link-1',
        vendedor_id: 'vendor-user-1',
        token: 'abc12345',
        activo: true,
        created_at: new Date(),
        expires_at: futureDate,
      };
      mockPrisma.linkInvitacion.create.mockResolvedValue(mockCreatedLink);

      const createRes = await request(app.getHttpServer())
        .post('/api/link-invitacion')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(201);

      // TransformInterceptor wraps in { data, timestamp, path }
      expect(createRes.body.data.linkUrl).toContain('/invitar/abc12345');
      expect(createRes.body.data.token).toBe('abc12345');
      expect(createRes.body.data.expiresAt).toBeDefined();
      expect(mockPrisma.linkInvitacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendedor_id: 'vendor-user-1',
            token: expect.any(String),
          }),
        }),
      );

      // ── LIST LINKS ──
      const mockLinkList = [
        {
          id: 'link-1',
          vendedor_id: 'vendor-user-1',
          token: 'abc12345',
          activo: true,
          created_at: new Date(),
          expires_at: futureDate,
        },
      ];
      mockPrisma.linkInvitacion.findMany.mockResolvedValue(mockLinkList);
      mockPrisma.linkInvitacion.count.mockResolvedValue(1);

      const listRes = await request(app.getHttpServer())
        .get('/api/link-invitacion')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.pagination.total).toBe(1);
      expect(listRes.body.data[0].token).toBe('abc12345');

      // ── DEACTIVATE LINK ──
      mockPrisma.linkInvitacion.updateMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer())
        .patch('/api/link-invitacion/link-1/deactivate')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Admin link flow: list by vendedor → deactivate any link
  // ────────────────────────────────────────────────────────────────────────
  describe('Admin LinkInvitacion CRUD flow', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = signToken('admin-1', 'super_admin', 'admin@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.admin);
    });

    it('admin puede listar links de un vendedor y desactivar cualquier link', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // ── LIST BY VENDEDOR ──
      const mockLinkList = [
        {
          id: 'link-1',
          vendedor_id: 'vendor-user-1',
          token: 'abc12345',
          activo: true,
          created_at: new Date(),
          expires_at: futureDate,
        },
      ];
      mockPrisma.linkInvitacion.findMany.mockResolvedValue(mockLinkList);
      mockPrisma.linkInvitacion.count.mockResolvedValue(1);

      const listRes = await request(app.getHttpServer())
        .get('/api/admin/link-invitacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ vendedorId: 'vendor-user-1' })
        .expect(200);

      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].vendedor_id).toBe('vendor-user-1');

      // ── DEACTIVATE ANY LINK ──
      mockPrisma.linkInvitacion.updateMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer())
        .patch('/api/admin/link-invitacion/link-1/deactivate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('admin list sin vendedorId devuelve 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/link-invitacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('vendedorId');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Auth guard chain: 401, 403 wrong role for vendor & admin
  // ────────────────────────────────────────────────────────────────────────
  describe('Auth guard chain', () => {
    it('rechaza vendor request sin token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/link-invitacion')
        .expect(401);
    });

    it('rechaza vendor request con token inválido (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/link-invitacion')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('rechaza vendor request con rol cliente (403)', async () => {
      const token = signToken('cliente-user-1', 'cliente', 'cliente@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.cliente);

      await request(app.getHttpServer())
        .post('/api/link-invitacion')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza vendor request con rol admin (403)', async () => {
      const token = signToken('admin-1', 'super_admin', 'admin@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.admin);

      await request(app.getHttpServer())
        .post('/api/link-invitacion')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza admin request sin token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/link-invitacion')
        .expect(401);
    });

    it('rechaza admin request con token de vendedor (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .get('/api/admin/link-invitacion')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza admin request con token de cliente (403)', async () => {
      const token = signToken('cliente-user-1', 'cliente', 'cliente@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.cliente);

      await request(app.getHttpServer())
        .get('/api/admin/link-invitacion')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Error cases: deactivate non-existent, already inactive
  // ────────────────────────────────────────────────────────────────────────
  describe('Error cases', () => {
    let vendedorToken: string;

    beforeEach(() => {
      vendedorToken = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);
      mockPrisma.vendedor.findUnique.mockResolvedValue(MOCK_VENDEDOR);
    });

    it('lanza 404 al desactivar link que no existe', async () => {
      mockPrisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.linkInvitacion.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/link-invitacion/fake-id/deactivate')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });

    it('lanza 400 al desactivar link ya inactivo', async () => {
      mockPrisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.linkInvitacion.findFirst.mockResolvedValue({
        id: 'link-1',
        vendedor_id: 'vendor-user-1',
        token: 'abc12345',
        activo: false,
      });

      await request(app.getHttpServer())
        .patch('/api/link-invitacion/link-1/deactivate')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(400);
    });
  });
});
