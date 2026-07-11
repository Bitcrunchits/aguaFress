import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuditAction } from '@agua/contracts';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    prisma = mockPrisma;
  });

  // ═══════════════════════════════════════════════
  //  RECORD
  // ═══════════════════════════════════════════════

  describe('record', () => {
    it('inserta fila completa con todos los campos opcionales', async () => {
      const mockAuditLog = {
        id: 'log-1',
        usuario_id: 'user-1',
        accion: AuditAction.USER_REGISTERED,
        target_id: 'target-1',
        detalle: { source: 'web' },
        ip: '192.168.1.1',
        created_at: new Date(),
      };
      mockPrisma.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.record(
        AuditAction.USER_REGISTERED,
        'user-1',
        { targetId: 'target-1', detail: { source: 'web' }, ip: '192.168.1.1' },
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'user-1',
          accion: AuditAction.USER_REGISTERED,
          target_id: 'target-1',
          detalle: { source: 'web' },
          ip: '192.168.1.1',
        },
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('inserta fila minima solo con action y userId (opcionales null)', async () => {
      const mockAuditLog = {
        id: 'log-2',
        usuario_id: 'user-2',
        accion: AuditAction.QR_CREATED,
        target_id: null,
        detalle: undefined,
        ip: null,
        created_at: new Date(),
      };
      mockPrisma.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.record(AuditAction.QR_CREATED, 'user-2');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          usuario_id: 'user-2',
          accion: AuditAction.QR_CREATED,
          target_id: null,
          detalle: undefined,
          ip: null,
        },
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('lanza BadRequestException cuando action no es valido', async () => {
      const invalidAction = 'INVALID_ACTION' as AuditAction;

      await expect(
        service.record(invalidAction, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.record(invalidAction, 'user-1'),
      ).rejects.toThrow('Invalid audit action: INVALID_ACTION');

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════
  //  FIND ALL
  // ═══════════════════════════════════════════════

  describe('findAll', () => {
    it('devuelve lista paginada sin filtros', async () => {
      const mockRows = [
        {
          id: 'log-1',
          accion: AuditAction.USER_REGISTERED,
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

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where: {},
        orderBy: { created_at: 'desc' },
        include: {
          actor: { select: { email: true, role: true } },
        },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].usuarioEmail).toBe('user@test.com');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('aplica todos los filtros combinados con AND', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({
        page: 2,
        limit: 10,
        usuarioId: 'user-1',
        accion: AuditAction.VENDEDOR_UPDATED,
        targetId: 'target-1',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
      });

      const where = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.usuario_id).toBe('user-1');
      expect(where.accion).toBe(AuditAction.VENDEDOR_UPDATED);
      expect(where.target_id).toBe('target-1');
      expect(where.created_at).toBeDefined();
      expect(where.created_at.gte).toBeInstanceOf(Date);
      expect(where.created_at.lte).toBeInstanceOf(Date);
    });

    it('respeta limite maximo de 100', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 999 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('devuelve array vacio cuando no hay resultados', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        usuarioId: 'nonexistent-user',
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
});
