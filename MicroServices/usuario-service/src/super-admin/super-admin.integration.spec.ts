import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { SuperAdminModule } from './super-admin.module';
import { PrismaService } from '../common/prisma/prisma.service';
import jwtConfig from '../common/config/env.config';

// ---------------------------------------------------------------------------
// Integration tests for Super Admin: profile CRUD, dashboard, auth guard chain
// ---------------------------------------------------------------------------
describe('SuperAdmin Integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const MOCK_USERS = {
    admin: { id: 'admin-user-1', email: 'admin@test.com', role: 'super_admin', is_active: true },
    vendedor: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor', is_active: true },
    cliente: { id: 'cliente-user-1', email: 'cliente@test.com', role: 'cliente', is_active: true },
  };

  const MOCK_SUPER_ADMIN = {
    id: 'sa-1',
    auth_user_id: 'admin-user-1',
    nombre: 'Admin',
    apellido: 'Root',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-06-01'),
    auth_user: {
      id: 'admin-user-1',
      email: 'admin@test.com',
      role: 'super_admin',
      is_active: true,
    },
  };

  function createMockPrisma() {
    return {
      authUser: { findUnique: jest.fn() },
      superAdmin: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      vendedor: { count: jest.fn() },
      cliente: { count: jest.fn() },
      cartera: { count: jest.fn() },

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
        SuperAdminModule,
        ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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
  //  Auth guard chain — 401 no token, 401 bad token, 403 wrong role, 200 OK
  // ────────────────────────────────────────────────────────────────────────
  describe('Auth guard chain', () => {
    it('rechaza GET /super-admin/me sin token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/super-admin/me')
        .expect(401);
    });

    it('rechaza GET /super-admin/me con token inválido (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/super-admin/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('rechaza GET /super-admin/me con rol vendedor (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .get('/api/super-admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza GET /super-admin/me con rol cliente (403)', async () => {
      const token = signToken('cliente-user-1', 'cliente', 'cliente@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.cliente);

      await request(app.getHttpServer())
        .get('/api/super-admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza GET /super-admin/dashboard sin token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/super-admin/dashboard')
        .expect(401);
    });

    it('rechaza GET /super-admin/dashboard con rol vendedor (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .get('/api/super-admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  //  Profile CRUD — GET/PATCH success, partial update
  // ────────────────────────────────────────────────────────────────────────
  describe('Profile CRUD', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = signToken('admin-user-1', 'super_admin', 'admin@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.admin);
    });

    it('GET /super-admin/me devuelve perfil del super admin', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(MOCK_SUPER_ADMIN);

      const res = await request(app.getHttpServer())
        .get('/api/super-admin/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe('sa-1');
      expect(res.body.data.nombre).toBe('Admin');
      expect(res.body.data.apellido).toBe('Root');
      expect(res.body.data.email).toBe('admin@test.com');
      expect(res.body.data.role).toBe('super_admin');
    });

    it('PATCH /super-admin/me actualiza nombre y apellido', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(MOCK_SUPER_ADMIN);
      const updated = {
        ...MOCK_SUPER_ADMIN,
        nombre: 'Super',
        apellido: 'Admin',
      };
      mockPrisma.superAdmin.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/api/super-admin/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Super', apellido: 'Admin' })
        .expect(200);

      expect(res.body.data.nombre).toBe('Super');
      expect(res.body.data.apellido).toBe('Admin');
      expect(mockPrisma.superAdmin.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { auth_user_id: 'admin-user-1' },
          data: { nombre: 'Super', apellido: 'Admin' },
        }),
      );
    });

    it('PATCH /super-admin/me actualiza solo apellido (parcial)', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(MOCK_SUPER_ADMIN);
      const updated = {
        ...MOCK_SUPER_ADMIN,
        apellido: 'Nuevo',
      };
      mockPrisma.superAdmin.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/api/super-admin/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ apellido: 'Nuevo' })
        .expect(200);

      expect(res.body.data.apellido).toBe('Nuevo');
      expect(res.body.data.nombre).toBe('Admin');
    });

    it('PATCH /super-admin/me con body vacío devuelve perfil sin cambios', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(MOCK_SUPER_ADMIN);

      const res = await request(app.getHttpServer())
        .patch('/api/super-admin/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      // Should return existing profile without calling update
      expect(mockPrisma.superAdmin.update).not.toHaveBeenCalled();
      expect(res.body.data.id).toBe('sa-1');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  //  Dashboard — flat shape
  // ────────────────────────────────────────────────────────────────────────
  describe('Dashboard', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = signToken('admin-user-1', 'super_admin', 'admin@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.admin);
    });

    it('GET /super-admin/dashboard devuelve estadísticas con forma plana', async () => {
      mockPrisma.vendedor.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(3);
      mockPrisma.cliente.count.mockResolvedValue(50);
      mockPrisma.cartera.count.mockResolvedValue(40);
      mockPrisma.superAdmin.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .get('/api/super-admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual({
        totalVendedores: 10,
        vendedoresActivos: 6,
        vendedoresPendientes: 3,
        totalClientes: 50,
        clientesConVendedor: 40,
        totalSuperAdmins: 2,
      });
    });

    it('GET /super-admin/dashboard devuelve ceros en plataforma vacía', async () => {
      mockPrisma.vendedor.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.cliente.count.mockResolvedValue(0);
      mockPrisma.cartera.count.mockResolvedValue(0);
      mockPrisma.superAdmin.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/super-admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual({
        totalVendedores: 0,
        vendedoresActivos: 0,
        vendedoresPendientes: 0,
        totalClientes: 0,
        clientesConVendedor: 0,
        totalSuperAdmins: 1,
      });
    });
  });
});
