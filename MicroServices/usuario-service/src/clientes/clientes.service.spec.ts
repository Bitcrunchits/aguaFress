import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipoFactura } from '@agua/contracts';
import { ClientesService } from './clientes.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockTx = {
  vendedor: { findUnique: jest.fn() },
  cliente: { findUnique: jest.fn(), update: jest.fn() },
  cartera: { upsert: jest.fn(), updateMany: jest.fn() },
};

const mockPrisma = {
  cliente: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  vendedor: {
    findUnique: jest.fn(),
  },
  cartera: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
    prisma = mockPrisma;
  });

  // ═══════════════════════════════════════════════
  //  LIST — admin
  // ═══════════════════════════════════════════════

  describe('list', () => {
    const mockClientes = [
      {
        id: 'cliente-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
        telefono: '11-5555-0100',
        tipo_factura: TipoFactura.B,
        direccion_calle: 'Av. Siempre Viva',
        direccion_numero: '742',
        direccion_piso: null,
        direccion_referencia: null,
        direccion_barrio: null,
        direccion_ciudad: 'CABA',
        direccion_provincia: 'CABA',
        direccion_cp: '1000',
        latitud: null,
        longitud: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-06-01'),
        vendedor: {
          id: 'v-1',
          nombre: 'Carlos',
          apellido: 'López',
          empresa: 'Acme SA',
        },
        _count: { cartera: 1 },
      },
      {
        id: 'cliente-2',
        nombre: 'María',
        apellido: 'García',
        dni: '87654321',
        telefono: null,
        tipo_factura: null,
        direccion_calle: null,
        direccion_numero: null,
        direccion_piso: null,
        direccion_referencia: null,
        direccion_barrio: null,
        direccion_ciudad: null,
        direccion_provincia: null,
        direccion_cp: null,
        latitud: null,
        longitud: null,
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-06-02'),
        vendedor: {
          id: 'v-2',
          nombre: 'Ana',
          apellido: 'Martínez',
          empresa: 'Beta SA',
        },
        _count: { cartera: 1 },
      },
    ];

    it('returns paginated list with default values', async () => {
      prisma.cliente.findMany.mockResolvedValue(mockClientes);
      prisma.cliente.count.mockResolvedValue(2);

      const result = await service.list({});

      expect(prisma.cliente.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: {},
        orderBy: { created_at: 'desc' },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(prisma.cliente.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        data: expect.any(Array),
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });
      expect(result.data).toHaveLength(2);
    });

    it('filtra por vendedor_id cuando se provee', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.list({ vendedorId: 'v-1' });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cartera: { some: { vendedor_id: 'v-1', activo: true } } },
        }),
      );
      expect(prisma.cliente.count).toHaveBeenCalledWith({
        where: { cartera: { some: { vendedor_id: 'v-1', activo: true } } },
      });
    });

    it('busca por texto en nombre, apellido y dni (case-insensitive)', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.list({ search: 'García' });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { nombre: { contains: 'García', mode: 'insensitive' } },
              { apellido: { contains: 'García', mode: 'insensitive' } },
              { dni: { contains: 'García', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('combina filtro vendedor_id + search', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.list({ vendedorId: 'v-1', search: 'Pérez' });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cartera: { some: { vendedor_id: 'v-1', activo: true } },
            OR: [
              { nombre: { contains: 'Pérez', mode: 'insensitive' } },
              { apellido: { contains: 'Pérez', mode: 'insensitive' } },
              { dni: { contains: 'Pérez', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('pagina correctamente con page y limit personalizados', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(50);

      const result = await service.list({ page: 3, limit: 10 });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
    });

    it('incluye vendedor info y _count de cartera en cada cliente', async () => {
      prisma.cliente.findMany.mockResolvedValue([mockClientes[0]]);
      prisma.cliente.count.mockResolvedValue(1);

      const result = await service.list({});

      expect(result.data[0]).toMatchObject({
        vendedor: {
          id: 'v-1',
          nombre: 'Carlos',
          apellido: 'López',
          empresa: 'Acme SA',
        },
        _count: { cartera: 1 },
      });
    });
  });

  // ═══════════════════════════════════════════════
  //  GET BY ID — admin
  // ═══════════════════════════════════════════════

  describe('getById', () => {
    const fullCliente = {
      id: 'cliente-1',
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      telefono: '11-5555-0100',
      tipo_factura: TipoFactura.B,
      direccion_calle: 'Av. Siempre Viva',
      direccion_numero: '742',
      direccion_piso: null,
      direccion_referencia: null,
      direccion_barrio: null,
      direccion_ciudad: 'CABA',
      direccion_provincia: 'CABA',
      direccion_cp: '1000',
      latitud: null,
      longitud: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
      vendedor: {
        id: 'v-1',
        nombre: 'Carlos',
        apellido: 'López',
        empresa: 'Acme SA',
      },
      _count: {
        cartera: 3,
      },
    };

    it('devuelve cliente completo con vendedor info y _count cartera', async () => {
      prisma.cliente.findUnique.mockResolvedValue(fullCliente);

      const result = await service.getById('cliente-1');

      expect(prisma.cliente.findUnique).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('cliente-1');
      expect(result.vendedor.id).toBe('v-1');
      expect(result._count.cartera).toBe(3);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.getById('fake-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getById('fake-id')).rejects.toThrow(
        'Cliente not found',
      );
    });

    it('incluye todos los campos del perfil del cliente', async () => {
      prisma.cliente.findUnique.mockResolvedValue(fullCliente);

      const result = await service.getById('cliente-1');

      expect(result.nombre).toBe('Juan');
      expect(result.apellido).toBe('Pérez');
      expect(result.dni).toBe('12345678');
      expect(result.tipo_factura).toBe(TipoFactura.B);
    });
  });

  // ═══════════════════════════════════════════════
  //  UPDATE — admin
  // ═══════════════════════════════════════════════

  describe('update', () => {
    const existingCliente = {
      id: 'cliente-1',
      nombre: 'Juan',
      apellido: 'Pérez',
    };

    it('actualiza solo los campos provistos con snake_case mapping', async () => {
      prisma.cliente.findUnique.mockResolvedValue(existingCliente);
      prisma.cliente.update.mockResolvedValue({
        ...existingCliente,
        telefono: '11-5555-0199',
        direccion_calle: 'Av. Corrientes',
        direccion_numero: '1234',
      });

      const result = await service.update('cliente-1', {
        telefono: '11-5555-0199',
        direccionCalle: 'Av. Corrientes',
        direccionNumero: '1234',
      });

      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
        data: {
          telefono: '11-5555-0199',
          direccion_calle: 'Av. Corrientes',
          direccion_numero: '1234',
        },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(result.telefono).toBe('11-5555-0199');
    });

    it('lanza NotFoundException si el cliente no existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(
        service.update('fake-id', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.cliente.update).not.toHaveBeenCalled();
    });

    it('actualiza un solo campo parcialmente', async () => {
      prisma.cliente.findUnique.mockResolvedValue(existingCliente);
      prisma.cliente.update.mockResolvedValue({
        ...existingCliente,
        apellido: 'García',
      });

      const result = await service.update('cliente-1', {
        apellido: 'García',
      });

      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
        data: { apellido: 'García' },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(result.apellido).toBe('García');
    });

    it('mapea direccionPiso → direccion_piso', async () => {
      prisma.cliente.findUnique.mockResolvedValue(existingCliente);
      prisma.cliente.update.mockResolvedValue({
        ...existingCliente,
        direccion_piso: '3',
      });

      await service.update('cliente-1', { direccionPiso: '3' });

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { direccion_piso: '3' },
        }),
      );
    });

    it('mapea tipoFactura → tipo_factura', async () => {
      prisma.cliente.findUnique.mockResolvedValue(existingCliente);
      prisma.cliente.update.mockResolvedValue({
        ...existingCliente,
        tipo_factura: TipoFactura.C,
      });

      await service.update('cliente-1', { tipoFactura: TipoFactura.C });

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tipo_factura: TipoFactura.C },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  //  REASSIGN — admin
  // ═══════════════════════════════════════════════

  describe('reassign', () => {
    it('reasigna vendedor y upserta cartera via $transaction', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        vendedor_id: 'v-1',
        auth_user_id: 'cliente-user-1',
      });
      mockTx.vendedor.findUnique.mockResolvedValue({ id: 'v-2' });
      mockTx.cliente.update.mockResolvedValue({
        id: 'cliente-1',
        vendedor_id: 'v-2',
        nombre: 'Juan',
      });

      const result = await service.reassign('cliente-1', {
        vendedorId: 'v-2',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTx.vendedor.findUnique).toHaveBeenCalledWith({
        where: { id: 'v-2' },
        select: { id: true },
      });
      expect(mockTx.cliente.update).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
        data: { vendedor_id: 'v-2' },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(mockTx.cartera.upsert).toHaveBeenCalledWith({
        where: {
          vendedor_id_cliente_id: {
            vendedor_id: 'v-2',
            cliente_id: 'cliente-1',
          },
        },
        create: { vendedor_id: 'v-2', cliente_id: 'cliente-1', activo: true },
        update: { activo: true },
      });
      expect(result.id).toBe('cliente-1');
    });

    it('lanza NotFoundException si el nuevo vendedor no existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        vendedor_id: 'v-1',
        auth_user_id: 'cliente-user-1',
      });
      mockTx.vendedor.findUnique.mockResolvedValue(null);

      await expect(
        service.reassign('cliente-1', { vendedorId: 'fake-vendedor' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockTx.cliente.update).not.toHaveBeenCalled();
      expect(mockTx.cartera.upsert).not.toHaveBeenCalled();
    });

    it('preserva otras relaciones activas al cambiar solo el default V1', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        vendedor_id: 'v-1',
        auth_user_id: 'cliente-user-1',
      });
      mockTx.vendedor.findUnique.mockResolvedValue({ id: 'v-2' });
      mockTx.cliente.update.mockResolvedValue({ id: 'cliente-1', vendedor_id: 'v-2' });

      await service.reassign('cliente-1', { vendedorId: 'v-2' });

      expect(mockTx.cartera.updateMany).not.toHaveBeenCalled();
      expect(mockTx.cartera.upsert).toHaveBeenCalledWith({
        where: {
          vendedor_id_cliente_id: {
            vendedor_id: 'v-2',
            cliente_id: 'cliente-1',
          },
        },
        create: { vendedor_id: 'v-2', cliente_id: 'cliente-1', activo: true },
        update: { activo: true },
      });
    });
  });

  describe('listProvidersForClienteUser', () => {
    it('lista proveedores desde relaciones de cartera activas y marca default activo', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cliente-1',
        vendedor_id: 'v-2',
        cartera: [
          {
            vendedor_id: 'v-1',
            vendedor: {
              id: 'v-1',
              nombre: 'Proveedor Uno',
              apellido: 'Norte',
              empresa: 'Agua Norte',
              logo: null,
              telefono: '111',
              ciudad_default: 'CABA',
            },
          },
          {
            vendedor_id: 'v-2',
            vendedor: {
              id: 'v-2',
              nombre: 'Proveedor Dos',
              apellido: '',
              empresa: null,
              logo: 'logo.png',
              telefono: '',
              ciudad_default: 'La Plata',
            },
          },
        ],
      });

      const result = await service.listProvidersForClienteUser('cliente-user-1');

      expect(prisma.cliente.findUnique).toHaveBeenCalledWith({
        where: { auth_user_id: 'cliente-user-1' },
        select: expect.objectContaining({
          id: true,
          vendedor_id: true,
          cartera: expect.objectContaining({
            where: { activo: true },
          }),
        }),
      });
      expect(result.providers).toHaveLength(2);
      expect(result.providers[0]).toMatchObject({ id: 'v-1', nombre: 'Proveedor Uno', isDefault: false });
      expect(result.providers[1]).toMatchObject({ id: 'v-2', nombre: 'Proveedor Dos', logo: 'logo.png', ciudad: 'La Plata', isDefault: true });
      expect(result.defaultVendedorId).toBe('v-2');
      expect(result.requiresSelection).toBe(true);
    });

    it('devuelve lista vacía sin default cuando el cliente no tiene cartera activa', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cliente-1', vendedor_id: 'v-1', cartera: [] });

      const result = await service.listProvidersForClienteUser('cliente-user-1');

      expect(result).toEqual({ providers: [], defaultVendedorId: undefined, requiresSelection: false });
    });
  });

  describe('selectProviderForClienteUser', () => {
    it('acepta solo un proveedor activo de cartera del cliente autenticado', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cliente-1', vendedor_id: 'v-2' });
      prisma.cartera.findFirst.mockResolvedValue({
        vendedor_id: 'v-2',
        vendedor: {
          id: 'v-2',
          nombre: 'Proveedor Dos',
          apellido: 'Sur',
          empresa: 'Agua Sur',
          logo: null,
          telefono: '222',
          ciudad_default: 'Rosario',
        },
      });

      const result = await service.selectProviderForClienteUser('cliente-user-1', 'v-2');

      expect(prisma.cartera.findFirst).toHaveBeenCalledWith({
        where: { cliente_id: 'cliente-1', vendedor_id: 'v-2', activo: true },
        include: expect.objectContaining({ vendedor: expect.any(Object) }),
      });
      expect(result.selectedProvider).toMatchObject({ id: 'v-2', nombre: 'Proveedor Dos', empresa: 'Agua Sur', ciudad: 'Rosario', isDefault: true });
    });

    it('rechaza selección si no existe relación activa con ese vendedor', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cliente-1', vendedor_id: 'v-1' });
      prisma.cartera.findFirst.mockResolvedValue(null);

      await expect(service.selectProviderForClienteUser('cliente-user-1', 'v-9')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════
  //  LIST MIOS — vendedor-scoped (cartera)
  // ═══════════════════════════════════════════════

  describe('listOwn', () => {
    const mockClientesCartera = [
      {
        id: 'cliente-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '11-5555-0100',
        direccion_calle: 'Av. Siempre Viva',
        direccion_numero: '742',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-06-01'),
        vendedor: {
          id: 'v-1',
          nombre: 'Carlos',
          apellido: 'López',
          empresa: 'Acme SA',
        },
        _count: { cartera: 1 },
      },
    ];

    it('filtra por cartera del vendedor autenticado', async () => {
      prisma.cliente.findMany.mockResolvedValue(mockClientesCartera);
      prisma.cliente.count.mockResolvedValue(1);

      const result = await service.listOwn('vendedor-1', {});

      expect(prisma.cliente.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: { cartera: { some: { vendedor_id: 'vendedor-1', activo: true } } },
        orderBy: { created_at: 'desc' },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(prisma.cliente.count).toHaveBeenCalledWith({
        where: { cartera: { some: { vendedor_id: 'vendedor-1', activo: true } } },
      });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('aplica search dentro del scope de cartera', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.listOwn('vendedor-1', { search: 'Pérez' });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cartera: { some: { vendedor_id: 'vendedor-1', activo: true } },
            OR: [
              { nombre: { contains: 'Pérez', mode: 'insensitive' } },
              { apellido: { contains: 'Pérez', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('pagina correctamente en listOwn', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      const result = await service.listOwn('vendedor-1', { page: 2, limit: 5 });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════
  //  GET BY ID MIO — vendedor-scoped
  // ═══════════════════════════════════════════════

  describe('getOwnById', () => {
    const clienteEnCartera = {
      id: 'cliente-1',
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      telefono: '11-5555-0100',
      tipo_factura: TipoFactura.B,
      direccion_calle: 'Av. Siempre Viva',
      direccion_numero: '742',
      direccion_piso: null,
      direccion_referencia: null,
      direccion_barrio: null,
      direccion_ciudad: 'CABA',
      direccion_provincia: 'CABA',
      direccion_cp: '1000',
      latitud: null,
      longitud: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
      vendedor: {
        id: 'v-1',
        nombre: 'Carlos',
        apellido: 'López',
        empresa: 'Acme SA',
      },
      _count: { cartera: 1 },
    };

    it('devuelve cliente si está en la cartera del vendedor', async () => {
      prisma.cliente.findFirst.mockResolvedValue(clienteEnCartera);

      const result = await service.getOwnById('cliente-1', 'vendedor-1');

      expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cliente-1',
          cartera: { some: { vendedor_id: 'vendedor-1', activo: true } },
        },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(result.id).toBe('cliente-1');
    });

    it('lanza 404 si el cliente no está en la cartera (no existence leak)', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.getOwnById('cliente-no-en-cartera', 'vendedor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza 404 si el cliente no existe (misma respuesta que no-cartera)', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.getOwnById('fake-id', 'vendedor-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════
  //  UPDATE MIO — vendedor-scoped
  // ═══════════════════════════════════════════════

  describe('updateOwn', () => {
    const clienteEnCartera = {
      id: 'cliente-1',
      nombre: 'Juan',
      apellido: 'Pérez',
    };

    it('actualiza campos del cliente en cartera', async () => {
      prisma.cliente.findFirst.mockResolvedValue(clienteEnCartera);
      prisma.cliente.update.mockResolvedValue({
        ...clienteEnCartera,
        telefono: '11-5555-0199',
      });

      const result = await service.updateOwn('cliente-1', 'vendedor-1', {
        telefono: '11-5555-0199',
      });

      expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cliente-1',
          cartera: { some: { vendedor_id: 'vendedor-1', activo: true } },
        },
        select: { id: true },
      });
      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
        data: { telefono: '11-5555-0199' },
        include: {
          vendedor: { select: { id: true, nombre: true, apellido: true, empresa: true } },
          _count: { select: { cartera: true } },
        },
      });
      expect(result.telefono).toBe('11-5555-0199');
    });

    it('lanza 404 si el cliente no está en cartera (no existence leak)', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOwn('cliente-no-en-cartera', 'vendedor-1', {
          nombre: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.cliente.update).not.toHaveBeenCalled();
    });

    it('mapea campos de direccion de camelCase a snake_case', async () => {
      prisma.cliente.findFirst.mockResolvedValue(clienteEnCartera);
      prisma.cliente.update.mockResolvedValue({
        ...clienteEnCartera,
        direccion_ciudad: 'Córdoba',
        direccion_provincia: 'Córdoba',
      });

      await service.updateOwn('cliente-1', 'vendedor-1', {
        direccionCiudad: 'Córdoba',
        direccionProvincia: 'Córdoba',
      });

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            direccion_ciudad: 'Córdoba',
            direccion_provincia: 'Córdoba',
          },
        }),
      );
    });

    it('actualiza solo un campo (parcial)', async () => {
      prisma.cliente.findFirst.mockResolvedValue(clienteEnCartera);
      prisma.cliente.update.mockResolvedValue({
        ...clienteEnCartera,
        nombre: 'Juan Updated',
      });

      await service.updateOwn('cliente-1', 'vendedor-1', {
        nombre: 'Juan Updated',
      });

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nombre: 'Juan Updated' },
        }),
      );
    });

    it('lanza 404 si el cliente simplemente no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOwn('fake-id', 'vendedor-1', {
          nombre: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
