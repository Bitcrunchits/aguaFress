import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { ClientesModule } from './clientes.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TipoFactura } from '@agua/contracts';
import jwtConfig from '../common/config/env.config';

// ---------------------------------------------------------------------------
// Integration tests for Clientes: admin CRUD, guard chain, vendedor scoping
// ---------------------------------------------------------------------------
describe('Clientes Integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockTx: ReturnType<typeof createMockTx>;

  // Default mock users returned by JwtStrategy.validate()
  const MOCK_USERS = {
    admin: { id: 'admin-1', email: 'admin@test.com', role: 'super_admin', is_active: true },
    vendedor: { id: 'vendor-user-1', email: 'vendedor@test.com', role: 'vendedor', is_active: true },
    cliente: { id: 'cliente-user-1', email: 'cliente@test.com', role: 'cliente', is_active: true },
  };

  const MOCK_VENDEDOR = {
    id: 'vendor-user-1',
    nombre: 'Juan',
    apellido: 'Pérez',
    empresa: 'Agua SA',
  };

  // Default cliente records
  const MOCK_CLIENTES = {
    enCartera: {
      id: 'cliente-1',
      auth_user_id: 'cliente-user-1',
      nombre: 'Ana',
      apellido: 'López',
      dni: '12345678',
      telefono: '11-5555-0100',
      tipo_factura: 'B' as const,
      direccion_calle: 'Calle Falsa',
      direccion_numero: '123',
      direccion_piso: null,
      direccion_referencia: null,
      direccion_barrio: null,
      direccion_ciudad: 'Capital Federal',
      direccion_provincia: null,
      direccion_cp: null,
      latitud: null,
      longitud: null,
      vendedor_id: 'vendor-user-1',
      created_at: new Date(),
      updated_at: new Date(),
      vendedor: { id: 'vendor-user-1', nombre: 'Juan', apellido: 'Pérez', empresa: 'Agua SA' },
      _count: { cartera: 1 },
    },
    otraCartera: {
      id: 'cliente-2',
      auth_user_id: 'cliente-user-2',
      nombre: 'Pedro',
      apellido: 'García',
      dni: '87654321',
      telefono: '11-5555-0200',
      tipo_factura: 'C' as const,
      direccion_calle: 'Av. Siempreviva',
      direccion_numero: '742',
      direccion_piso: null,
      direccion_referencia: null,
      direccion_barrio: null,
      direccion_ciudad: 'Buenos Aires',
      direccion_provincia: null,
      direccion_cp: null,
      latitud: null,
      longitud: null,
      vendedor_id: 'other-vendor-1',
      created_at: new Date(),
      updated_at: new Date(),
      vendedor: { id: 'other-vendor-1', nombre: 'Carlos', apellido: 'Gómez', empresa: 'Agua Ltda' },
      _count: { cartera: 1 },
    },
  };

  function createMockPrisma() {
    return {
      authUser: { findUnique: jest.fn() },
      cliente: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      vendedor: {
        findUnique: jest.fn(),
      },
      cartera: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };
  }

  function createMockTx() {
    return {
      vendedor: { findUnique: jest.fn() },
      cliente: { update: jest.fn() },
      cartera: { upsert: jest.fn(), updateMany: jest.fn() },
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
    mockTx = createMockTx();
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<any>) => cb(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClientesModule,
        AuditLogModule,
        ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(AuditLogService)
      .useValue({ record: jest.fn().mockResolvedValue(undefined) })
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
  // 4.1 — Full admin flow: list → getById → update → reassign
  // ────────────────────────────────────────────────────────────────────────
  describe('4.1 Full admin CRUD flow', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = signToken('admin-1', 'super_admin', 'admin@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.admin);
    });

    it('completa ciclo: list → getById → update → reassign', async () => {
      // ── LIST ──
      mockPrisma.cliente.findMany.mockResolvedValue([MOCK_CLIENTES.enCartera]);
      mockPrisma.cliente.count.mockResolvedValue(1);

      const listRes = await request(app.getHttpServer())
        .get('/api/clientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.pagination.total).toBe(1);
      expect(listRes.body.data[0].nombre).toBe('Ana');

      // ── GET BY ID ──
      mockPrisma.cliente.findUnique.mockResolvedValue(MOCK_CLIENTES.enCartera);

      const getRes = await request(app.getHttpServer())
        .get('/api/clientes/cliente-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRes.body.data.nombre).toBe('Ana');
      expect(getRes.body.data.vendedor.nombre).toBe('Juan');

      // ── UPDATE ──
      const updatedCliente = {
        ...MOCK_CLIENTES.enCartera,
        nombre: 'Ana María',
        telefono: '11-5555-0199',
      };
      mockPrisma.cliente.findUnique.mockResolvedValue(MOCK_CLIENTES.enCartera);
      mockPrisma.cliente.update.mockResolvedValue(updatedCliente);

      const updateRes = await request(app.getHttpServer())
        .patch('/api/clientes/cliente-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Ana María', telefono: '11-5555-0199' })
        .expect(200);

      expect(updateRes.body.data.nombre).toBe('Ana María');
      expect(updateRes.body.data.telefono).toBe('11-5555-0199');
      expect(mockPrisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cliente-1' },
          data: { nombre: 'Ana María', telefono: '11-5555-0199' },
        }),
      );

      // ── REASSIGN ──
      mockTx.vendedor.findUnique.mockResolvedValue({ id: 'new-vendor-1' });
      const reassignedCliente = {
        ...MOCK_CLIENTES.enCartera,
        vendedor_id: 'new-vendor-1',
      };
      mockTx.cliente.update.mockResolvedValue(reassignedCliente);

      const reassignRes = await request(app.getHttpServer())
        .patch('/api/clientes/cliente-1/reassign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorId: 'new-vendor-1' })
        .expect(200);

      expect(reassignRes.body.data.vendedor_id).toBe('new-vendor-1');
      expect(mockTx.vendedor.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-vendor-1' },
        select: { id: true },
      });
      expect(mockTx.cartera.upsert).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 4.2 — Auth guard chain: 401 no token, 403 wrong role
  // ────────────────────────────────────────────────────────────────────────
  describe('4.2 Auth guard chain', () => {
    it('rechaza request sin token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/clientes')
        .expect(401);
    });

    it('rechaza request con token inválido (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/clientes')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('rechaza request con rol cliente en endpoint admin (403)', async () => {
      const token = signToken('cliente-user-1', 'cliente', 'cliente@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.cliente);

      await request(app.getHttpServer())
        .get('/api/clientes')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza request con rol vendedor en endpoint admin (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .get('/api/clientes')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rechaza PATCH reassign sin token (401)', async () => {
      await request(app.getHttpServer())
        .patch('/api/clientes/cliente-1/reassign')
        .expect(401);
    });

    it('rechaza PATCH update con rol vendedor en endpoint admin (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .patch('/api/clientes/cliente-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Hacked' })
        .expect(403);
    });

    it('rechaza GET by ID con rol vendedor en endpoint admin (403)', async () => {
      const token = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);

      await request(app.getHttpServer())
        .get('/api/clientes/cliente-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // 4.3 — Vendedor scoping: listOwn only own cartera, 404 for non-cartera
  // ────────────────────────────────────────────────────────────────────────
  describe('4.3 Vendedor scoping', () => {
    let vendedorToken: string;

    beforeEach(() => {
      vendedorToken = signToken('vendor-user-1', 'vendedor', 'vendedor@test.com');
      mockPrisma.authUser.findUnique.mockResolvedValue(MOCK_USERS.vendedor);
    });

    it('vendedor puede listar su cartera via GET /clientes/mios', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([MOCK_CLIENTES.enCartera]);
      mockPrisma.cliente.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/clientes/mios')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].nombre).toBe('Ana');
      expect(res.body.data[0].vendedor_id).toBe('vendor-user-1');
      // Verify cartera scoping is actually applied to the query
      expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cartera: { some: { vendedor_id: 'vendor-user-1', activo: true } },
          }),
        }),
      );
      expect(mockPrisma.cliente.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cartera: { some: { vendedor_id: 'vendor-user-1', activo: true } },
          }),
        }),
      );
    });

    it('vendedor recibe 404 al obtener cliente NO en su cartera', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/clientes/mios/cliente-2')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);

      // Verify cartera scoping was applied — should use findFirst with vendedor_id
      expect(mockPrisma.cliente.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'cliente-2',
            cartera: { some: { vendedor_id: 'vendor-user-1', activo: true } },
          },
        }),
      );
    });

    it('vendedor recibe 404 al actualizar cliente NO en su cartera', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/clientes/mios/cliente-2')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nombre: 'Nuevo nombre' })
        .expect(404);

      // Verify cartera scoping was applied before update
      expect(mockPrisma.cliente.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'cliente-2',
            cartera: { some: { vendedor_id: 'vendor-user-1', activo: true } },
          },
        }),
      );
    });

    it('vendedor NO puede acceder a admin list (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/clientes')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('vendedor NO puede acceder a admin getById (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/clientes/cliente-1')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });
  });
});
