import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LinkInvitacionService } from './link-invitacion.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  linkInvitacion: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('LinkInvitacionService', () => {
  let service: LinkInvitacionService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkInvitacionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get<LinkInvitacionService>(LinkInvitacionService);
    prisma = mockPrisma;
  });

  // ═══════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════

  describe('create', () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    it('genera token y crea LinkInvitacion con activo:true y expires_at ~48h', async () => {
      const mockLink = {
        id: 'link-1',
        vendedor_id: 'vendedor-1',
        token: 'abc12345',
        activo: true,
        created_at: new Date(),
        expires_at: futureDate,
      };
      prisma.linkInvitacion.create.mockResolvedValue(mockLink);

      const result = await service.create('vendedor-1');

      expect(prisma.linkInvitacion.create).toHaveBeenCalledWith({
        data: {
          vendedor_id: 'vendedor-1',
          token: expect.any(String),
          expires_at: expect.any(Date),
        },
      });
      // Verify token length (8 chars from UUID slice)
      const token = prisma.linkInvitacion.create.mock.calls[0][0].data.token;
      expect(token).toHaveLength(8);
      // Verify expires_at is ~48 hours from now
      const expiresAt = prisma.linkInvitacion.create.mock.calls[0][0].data.expires_at;
      const diffMs = expiresAt.getTime() - Date.now();
      // Allow some tolerance for test execution time
      expect(diffMs).toBeGreaterThan(47.9 * 60 * 60 * 1000);
      expect(diffMs).toBeLessThan(48.1 * 60 * 60 * 1000);
      expect(result).toEqual(mockLink);
    });

    it('reintenta si hay conflicto de token unico (P2002) hasta 3 veces', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      const mockLink = {
        id: 'link-2',
        vendedor_id: 'vendedor-1',
        token: 'xyz98765',
        activo: true,
        created_at: new Date(),
        expires_at: futureDate,
      };

      prisma.linkInvitacion.create
        .mockRejectedValueOnce(uniqueError)
        .mockResolvedValueOnce(mockLink);

      const result = await service.create('vendedor-1');

      expect(prisma.linkInvitacion.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockLink);
    });

    it('lanza ConflictException si fallan los 3 intentos', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.linkInvitacion.create.mockRejectedValue(uniqueError);

      await expect(service.create('vendedor-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.linkInvitacion.create).toHaveBeenCalledTimes(3);
    });

    it('lanza ConflictException con mensaje claro', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.linkInvitacion.create.mockRejectedValue(uniqueError);

      await expect(service.create('vendedor-1')).rejects.toThrow(
        'Could not generate unique invitation link',
      );
    });

    it('NO reintenta errores que no son P2002', async () => {
      const otherError = new Error('DB connection lost');
      prisma.linkInvitacion.create.mockRejectedValue(otherError);

      await expect(service.create('vendedor-1')).rejects.toThrow(
        'DB connection lost',
      );
      expect(prisma.linkInvitacion.create).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════
  //  LIST
  // ═══════════════════════════════════════════════

  describe('list', () => {
    const linkRecords = [
      { id: 'link-1', vendedor_id: 'vendedor-1', token: 'aaa', activo: true },
      { id: 'link-2', vendedor_id: 'vendedor-1', token: 'bbb', activo: true },
    ];

    it('devuelve lista paginada con valores por defecto', async () => {
      prisma.linkInvitacion.findMany.mockResolvedValue(linkRecords);
      prisma.linkInvitacion.count.mockResolvedValue(2);

      const result = await service.list('vendedor-1', {});

      expect(prisma.linkInvitacion.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { vendedor_id: 'vendedor-1' },
        orderBy: { created_at: 'desc' },
        select: { id: true, token: true, activo: true, expires_at: true, created_at: true },
      });
      expect(prisma.linkInvitacion.count).toHaveBeenCalledWith({
        where: { vendedor_id: 'vendedor-1' },
      });
      expect(result).toEqual({
        data: expect.any(Array),
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
      expect(result.data).toHaveLength(2);
    });

    it('devuelve array vacio cuando no hay LinkInvitacion', async () => {
      prisma.linkInvitacion.findMany.mockResolvedValue([]);
      prisma.linkInvitacion.count.mockResolvedValue(0);

      const result = await service.list('vendedor-1', {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('pagina correctamente con page y limit personalizados', async () => {
      prisma.linkInvitacion.findMany.mockResolvedValue([]);
      prisma.linkInvitacion.count.mockResolvedValue(15);

      const result = await service.list('vendedor-1', { page: 2, limit: 10 });

      expect(prisma.linkInvitacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════
  //  LIST BY VENDEDOR (admin — delegates to list)
  // ═══════════════════════════════════════════════

  describe('listByVendedor', () => {
    it('delega a list() con el mismo vendedorId', async () => {
      const listSpy = jest.spyOn(service, 'list').mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await service.listByVendedor('vendedor-1', { page: 2, limit: 5 });

      expect(listSpy).toHaveBeenCalledWith('vendedor-1', {
        page: 2,
        limit: 5,
      });
    });
  });

  // ═══════════════════════════════════════════════
  //  DEACTIVATE (vendor — with ownership check)
  // ═══════════════════════════════════════════════

  describe('deactivate', () => {
    const activeLink = {
      id: 'link-1',
      vendedor_id: 'vendedor-1',
      token: 'abc123',
      activo: true,
    };

    it('desactiva LinkInvitacion propio (con ownership check)', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 1 });

      await service.deactivate('link-1', 'vendedor-1');

      expect(prisma.linkInvitacion.updateMany).toHaveBeenCalledWith({
        where: { id: 'link-1', activo: true, vendedor_id: 'vendedor-1' },
        data: { activo: false },
      });
    });

    it('lanza NotFoundException si el id no existe', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      prisma.linkInvitacion.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate('fake-id', 'vendedor-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.linkInvitacion.findFirst).toHaveBeenCalledWith({
        where: { id: 'fake-id', vendedor_id: 'vendedor-1' },
      });
    });

    it('lanza NotFoundException si el LinkInvitacion no pertenece al vendedor (no info leak)', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      prisma.linkInvitacion.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate('link-other', 'vendedor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el LinkInvitacion ya está inactivo', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      prisma.linkInvitacion.findFirst.mockResolvedValue({
        ...activeLink,
        activo: false,
      });

      await expect(
        service.deactivate('link-1', 'vendedor-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deactivate('link-1', 'vendedor-1'),
      ).rejects.toThrow('LinkInvitacion is already inactive');
    });
  });

  // ═══════════════════════════════════════════════
  //  DEACTIVATE ADMIN (no ownership check)
  // ═══════════════════════════════════════════════

  describe('deactivateAdmin', () => {
    const activeLink = {
      id: 'link-1',
      vendedor_id: 'vendedor-1',
      token: 'abc123',
      activo: true,
    };

    it('desactiva cualquier LinkInvitacion sin ownership check', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 1 });

      await service.deactivateAdmin('link-1');

      expect(prisma.linkInvitacion.updateMany).toHaveBeenCalledWith({
        where: { id: 'link-1', activo: true },
        data: { activo: false },
      });
    });

    it('lanza NotFoundException si el LinkInvitacion no existe', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      prisma.linkInvitacion.findUnique.mockResolvedValue(null);

      await expect(service.deactivateAdmin('fake-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.linkInvitacion.findUnique).toHaveBeenCalledWith({
        where: { id: 'fake-id' },
      });
    });

    it('lanza BadRequestException si el LinkInvitacion ya está inactivo', async () => {
      prisma.linkInvitacion.updateMany.mockResolvedValue({ count: 0 });
      prisma.linkInvitacion.findUnique.mockResolvedValue({
        ...activeLink,
        activo: false,
      });

      await expect(service.deactivateAdmin('link-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deactivateAdmin('link-1')).rejects.toThrow(
        'LinkInvitacion is already inactive',
      );
    });
  });
});
