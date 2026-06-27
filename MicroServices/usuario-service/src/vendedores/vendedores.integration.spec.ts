import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { VendedoresModule } from './vendedores.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { VendedorEstado } from '@agua/contracts';
import jwtConfig from '../common/config/env.config';

// ---------------------------------------------------------------------------
// Integration tests for Vendedores: admin CRUD, guard chain, self-service
// ---------------------------------------------------------------------------
describe('Vendedores Integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // Default mock users returned by JwtStrategy.validate()
  const MOCK_USERS = {
    admin: { id: 'admin-1', email: 'admin@test.com', role: 'super_admin', is_active: true },
    vendedor: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor', is_active: true },
    cliente: { id: 'cliente-user-1', email: 'cliente@test.com', role: 'cliente', is_active: true },
    vendedorInactivoUser: { id: 'inactivo-user-1', email: 'inactivo@test.com', role: 'vendedor', is_active: true },
  };

  // Default vendedor records
  const MOCK_VENDEDORES = {
    activo: {
      id: 'vendedor-1',
      auth_user_id: 'vendor-user-1',
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '11-5555-0100',
      empresa: 'Agua SA',
      logo: null,
      estado: VendedorEstado.ACTIVO,
      ciudad_default: null,
      zona_entrega: null,
      created_at: new Date(),
      updated_at: new Date(),
      auth_user: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor' },
      _count: { clientes: 3 },
    },
    inactivo: {
      id: 'vendedor-2',
      auth_user_id: 'inactivo-user-1',
      nombre: 'Pedro',
      apellido: 'Gómez',
      telefono: '11-5555-0200',
      empresa: 'Agua Ltda',
      logo: null,
      estado: VendedorEstado.INACTIVO,
      ciudad_default: null,
      zona_entrega: null,
      created_at: new Date(),
      updated_at: new Date(),
      auth_user: { id: 'inactivo-user-1', email: 'inactivo@test.com', role: 'vendedor' },
      _count: { clientes: 0 },
    },
  };

  function createMockPrisma() {
    return {
      authUser: { findUnique: jest.fn() },
      vendedor: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
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
        VendedoresModule,
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
  // 5.1 — Full admin flow: list → getById → update → changeEstado
  // ────────────────────────────────────────────────────────────────────────
  describe('5.1 Full admin CRUD flow', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = signToken('admin-1', 'super_admin', 'admin@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.admin);
    });

    it('completa ciclo: list → getById → update → changeEstado', async () => {
      // ── LIST ──
      mockPrisma.vendedor.findMany.mockResolvedValue([MOCK_VENDEDORES.activo]);
      mockPrisma.vendedor.count.mockResolvedValue(1);

      const listRes = await request(app.getHttpServer())
        .get('/api/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.total).toBe(1);
      expect(listRes.body.data[0].nombre).toBe('Juan');

      // ── GET BY ID ──
      mockPrisma.vendedor.findUnique.mockResolvedValue(MOCK_VENDEDORES.activo);

      const getRes = await request(app.getHttpServer())
        .get('/api/vendedores/vendedor-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRes.body.data.nombre).toBe('Juan');
      expect(getRes.body.data.auth_user.email).toBe('vendedor@test.com');

      // ── UPDATE ──
      const updatedVendedor = { ...MOCK_VENDEDORES.activo, empresa: 'Nueva SA' };
      mockPrisma.vendedor.findUnique.mockResolvedValue(MOCK_VENDEDORES.activo);
      mockPrisma.vendedor.update.mockResolvedValue(updatedVendedor);

      const updateRes = await request(app.getHttpServer())
        .patch('/api/vendedores/vendedor-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ empresa: 'Nueva SA' })
        .expect(200);

      expect(updateRes.body.data.empresa).toBe('Nueva SA');
      expect(mockPrisma.vendedor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vendedor-1' },
          data: { empresa: 'Nueva SA' },
        }),
      );

      // ── CHANGE ESTADO ──
      const estadoChanged = { ...MOCK_VENDEDORES.activo, estado: VendedorEstado.INACTIVO };
      mockPrisma.vendedor.findUnique.mockResolvedValue({ ...MOCK_VENDEDORES.activo, estado: VendedorEstado.ACTIVO });
      mockPrisma.vendedor.update.mockResolvedValue(estadoChanged);

      const estadoRes = await request(app.getHttpServer())
        .patch('/api/vendedores/vendedor-1/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: VendedorEstado.INACTIVO })
        .expect(200);

      expect(estadoRes.body.data.estado).toBe(VendedorEstado.INACTIVO);
      expect(mockPrisma.vendedor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vendedor-1' },
          data: { estado: VendedorEstado.INACTIVO },
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 5.2 — Auth guard chain: 401 no token, 403 wrong role, 403 inactive
  // ────────────────────────────────────────────────────────────────────────
  describe('5.2 Auth guard chain', () => {
    it('rechaza request sin token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/vendedores')
        .expect(401);
    });

    it('rechaza request con token inválido (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/vendedores')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('rechaza request con rol cliente en endpoint admin (403)', async () => {
      const token = signToken('cliente-user-1', 'cliente', 'cliente@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.cliente);

      await request(app.getHttpServer())
        .get('/api/vendedores')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza request con rol vendedor en endpoint admin (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .get('/api/vendedores')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza acceso a perfil propio cuando vendedor está inactivo (403)', async () => {
      const token = signToken('inactivo-user-1', 'vendedor', 'inactivo@test.com');
      // JwtStrategy passes — user is active
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedorInactivoUser);
      // VendedoresService.getMyProfile finds vendedor with inactivo estado
      mockPrisma.vendedor.findUnique.mockResolvedValue(MOCK_VENDEDORES.inactivo);

      await request(app.getHttpServer())
        .get('/api/vendedores/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 5.3 — Self-service scoping: vendedor can manage own profile only
  // ────────────────────────────────────────────────────────────────────────
  describe('5.3 Self-service scoping', () => {
    let vendedorToken: string;

    beforeEach(() => {
      vendedorToken = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);
    });

    it('vendedor puede obtener su perfil via GET /vendedores/me', async () => {
      mockPrisma.vendedor.findUnique.mockResolvedValue(MOCK_VENDEDORES.activo);

      const res = await request(app.getHttpServer())
        .get('/api/vendedores/me')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.data.nombre).toBe('Juan');
      expect(res.body.data.estado).toBe('activo');
      expect(res.body.data.auth_user.email).toBe('vendedor@test.com');
    });

    it('vendedor puede actualizar su perfil via PATCH /vendedores/me', async () => {
      mockPrisma.vendedor.findUnique.mockResolvedValueOnce(MOCK_VENDEDORES.activo);
      const updatedVendedor = {
        ...MOCK_VENDEDORES.activo,
        nombre: 'Juan Carlos',
        telefono: '11-5555-9999',
      };
      mockPrisma.vendedor.update.mockResolvedValue(updatedVendedor);

      const res = await request(app.getHttpServer())
        .patch('/api/vendedores/me')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nombre: 'Juan Carlos', telefono: '11-5555-9999' })
        .expect(200);

      expect(res.body.data.nombre).toBe('Juan Carlos');
      expect(res.body.data.telefono).toBe('11-5555-9999');
      expect(mockPrisma.vendedor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { auth_user_id: 'vendor-user-1' },
          data: { nombre: 'Juan Carlos', telefono: '11-5555-9999' },
        }),
      );
    });

    it('vendedor NO puede acceder a ver todos los vendedores (admin — 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/vendedores')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('vendedor NO puede acceder a getById de otro vendedor (admin — 403)', async () => {
      await request(app.getHttpServer())
        .get('/api/vendedores/otro-vendedor-id')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });
  });
});
