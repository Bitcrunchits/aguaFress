import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { AuditAction } from '@agua/contracts';
import { QrCodesService } from './qr-codes.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  vendedor: {
    findUnique: jest.fn(),
  },
  qrCode: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('QrCodesService', () => {
  let service: QrCodesService;
  let prisma: typeof mockPrisma;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'record'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrCodesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<QrCodesService>(QrCodesService);
    prisma = mockPrisma;
  });

  // ═══════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════

  describe('create', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    beforeEach(() => {
      mockPrisma.vendedor.findUnique.mockResolvedValue({ estado: 'activo' });
    });

    it('genera codigo y crea QrCode con activo:true y expires_at ~7 dias', async () => {
      const mockQr = {
        id: 'qr-1',
        vendedor_id: 'vendedor-1',
        codigo: 'abc12345',
        activo: true,
        created_at: new Date(),
        expires_at: futureDate,
      };
      prisma.qrCode.create.mockResolvedValue(mockQr);

      const result = await service.create('vendedor-1', 'actor-user-1');

      expect(prisma.qrCode.create).toHaveBeenCalledWith({
        data: {
          vendedor_id: 'vendedor-1',
          codigo: expect.any(String),
          expires_at: expect.any(Date),
        },
      });
      // Verify codigo length (8 chars from UUID slice)
      const codigo = prisma.qrCode.create.mock.calls[0][0].data.codigo;
      expect(codigo).toHaveLength(8);
      // Verify expires_at is ~7 days from now
      const expiresAt = prisma.qrCode.create.mock.calls[0][0].data.expires_at;
      const diffMs = expiresAt.getTime() - Date.now();
      // Allow some tolerance for test execution time
      expect(diffMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
      expect(diffMs).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
      expect(result).toEqual(mockQr);
      expect(auditLogService.record).toHaveBeenCalledWith(AuditAction.QR_CREATED, 'actor-user-1', { targetId: 'qr-1' });
    });

    it('reintenta si hay conflicto de codigo unico (P2002) hasta 3 veces', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      const mockQr = {
        id: 'qr-2',
        vendedor_id: 'vendedor-1',
        codigo: 'xyz98765',
        activo: true,
        created_at: new Date(),
        expires_at: futureDate,
      };

      prisma.qrCode.create
        .mockRejectedValueOnce(uniqueError)
        .mockResolvedValueOnce(mockQr);

      const result = await service.create('vendedor-1', 'actor-user-1');

      expect(prisma.qrCode.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockQr);
    });

    it('lanza ConflictException si fallan los 3 intentos', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.qrCode.create.mockRejectedValue(uniqueError);

      await expect(service.create('vendedor-1', 'actor-user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.qrCode.create).toHaveBeenCalledTimes(3);
    });

    it('lanza ConflictException con mensaje claro', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.qrCode.create.mockRejectedValue(uniqueError);

      await expect(service.create('vendedor-1', 'actor-user-1')).rejects.toThrow(
        'Could not generate unique QR code',
      );
    });

    it('NO reintenta errores que no son P2002', async () => {
      const otherError = new Error('DB connection lost');
      prisma.qrCode.create.mockRejectedValue(otherError);

      await expect(service.create('vendedor-1', 'actor-user-1')).rejects.toThrow(
        'DB connection lost',
      );
      expect(prisma.qrCode.create).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════
  //  LIST
  // ═══════════════════════════════════════════════

  describe('list', () => {
    const qrRecords = [
      { id: 'qr-1', vendedor_id: 'vendedor-1', codigo: 'aaa', activo: true },
      { id: 'qr-2', vendedor_id: 'vendedor-1', codigo: 'bbb', activo: true },
    ];

    it('devuelve lista paginada con valores por defecto', async () => {
      prisma.qrCode.findMany.mockResolvedValue(qrRecords);
      prisma.qrCode.count.mockResolvedValue(2);

      const result = await service.list('vendedor-1', {});

      expect(prisma.qrCode.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { vendedor_id: 'vendedor-1' },
        orderBy: { created_at: 'desc' },
        select: { id: true, codigo: true, activo: true, expires_at: true, created_at: true },
      });
      expect(prisma.qrCode.count).toHaveBeenCalledWith({
        where: { vendedor_id: 'vendedor-1' },
      });
      expect(result).toEqual({
        data: expect.any(Array),
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
      expect(result.data).toHaveLength(2);
    });

    it('devuelve array vacio cuando no hay QrCodes', async () => {
      prisma.qrCode.findMany.mockResolvedValue([]);
      prisma.qrCode.count.mockResolvedValue(0);

      const result = await service.list('vendedor-1', {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('pagina correctamente con page y limit personalizados', async () => {
      prisma.qrCode.findMany.mockResolvedValue([]);
      prisma.qrCode.count.mockResolvedValue(15);

      const result = await service.list('vendedor-1', { page: 2, limit: 10 });

      expect(prisma.qrCode.findMany).toHaveBeenCalledWith(
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
    const activeQr = {
      id: 'qr-1',
      vendedor_id: 'vendedor-1',
      codigo: 'abc123',
      activo: true,
    };

    it('desactiva QrCode propio (con ownership check)', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 1 });

      await service.deactivate('qr-1', 'vendedor-1', 'actor-user-1');

      expect(prisma.qrCode.updateMany).toHaveBeenCalledWith({
        where: { id: 'qr-1', activo: true, vendedor_id: 'vendedor-1' },
        data: { activo: false },
      });
      expect(auditLogService.record).toHaveBeenCalledWith(AuditAction.QR_DEACTIVATED, 'actor-user-1', { targetId: 'qr-1' });
    });

    it('lanza NotFoundException si el id no existe', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.qrCode.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate('fake-id', 'vendedor-1', 'actor-user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.qrCode.findFirst).toHaveBeenCalledWith({
        where: { id: 'fake-id', vendedor_id: 'vendedor-1' },
      });
    });

    it('lanza NotFoundException si el QrCode no pertenece al vendedor (no info leak)', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.qrCode.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate('qr-other', 'vendedor-1', 'actor-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el QrCode ya está inactivo', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.qrCode.findFirst.mockResolvedValue({
        ...activeQr,
        activo: false,
      });

      await expect(
        service.deactivate('qr-1', 'vendedor-1', 'actor-user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deactivate('qr-1', 'vendedor-1', 'actor-user-1'),
      ).rejects.toThrow('QR code is already inactive');
    });
  });

  // ═══════════════════════════════════════════════
  //  DEACTIVATE ADMIN (no ownership check)
  // ═══════════════════════════════════════════════

  describe('deactivateAdmin', () => {
    const activeQr = {
      id: 'qr-1',
      vendedor_id: 'vendedor-1',
      codigo: 'abc123',
      activo: true,
    };

    it('desactiva cualquier QrCode sin ownership check', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 1 });

      await service.deactivateAdmin('qr-1', 'admin-user-1');

      expect(prisma.qrCode.updateMany).toHaveBeenCalledWith({
        where: { id: 'qr-1', activo: true },
        data: { activo: false },
      });
      expect(auditLogService.record).toHaveBeenCalledWith(AuditAction.QR_DEACTIVATED, 'admin-user-1', { targetId: 'qr-1' });
    });

    it('lanza NotFoundException si el QrCode no existe', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.qrCode.findUnique.mockResolvedValue(null);

      await expect(service.deactivateAdmin('fake-id', 'admin-user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.qrCode.findUnique).toHaveBeenCalledWith({
        where: { id: 'fake-id' },
      });
    });

    it('lanza BadRequestException si el QrCode ya está inactivo', async () => {
      prisma.qrCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.qrCode.findUnique.mockResolvedValue({
        ...activeQr,
        activo: false,
      });

      await expect(service.deactivateAdmin('qr-1', 'admin-user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deactivateAdmin('qr-1', 'admin-user-1')).rejects.toThrow(
        'QR code is already inactive',
      );
    });
  });
});
