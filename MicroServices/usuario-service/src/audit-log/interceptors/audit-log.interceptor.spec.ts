import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditAction } from '@agua/contracts';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let mockAuditLogService: jest.Mocked<Pick<AuditLogService, 'record'>>;
  let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let mockPrisma: { auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock } };

  function createMockExecutionContext(action?: AuditAction) {
    const request: any = {
      user: { userId: 'user-1' },
      params: { id: 'target-1' },
      headers: {},
      ip: '192.168.1.1',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  function createMockCallHandler(response: unknown) {
    return {
      handle: () => of(response),
    } as any;
  }

  beforeEach(async () => {
    mockAuditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    mockReflector = { getAllAndOverride: jest.fn() };
    mockPrisma = {
      auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
  });

  // ═══════════════════════════════════════════════
  //  Logs after success
  // ═══════════════════════════════════════════════

  it('llama record() con action, userId, targetId e ip despues de 2xx', (done) => {
    mockReflector.getAllAndOverride.mockReturnValue(AuditAction.VENDEDOR_UPDATED);

    const context = createMockExecutionContext(AuditAction.VENDEDOR_UPDATED);
    const callHandler = createMockCallHandler({ success: true });

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(mockAuditLogService.record).toHaveBeenCalledWith(
          AuditAction.VENDEDOR_UPDATED,
          'user-1',
          { targetId: 'target-1', ip: '192.168.1.1' },
        );
        done();
      },
    });
  });

  // ═══════════════════════════════════════════════
  //  Skips on exception
  // ═══════════════════════════════════════════════

  it('NO llama record() cuando el handler lanza error', (done) => {
    mockReflector.getAllAndOverride.mockReturnValue(AuditAction.VENDEDOR_UPDATED);

    const context = createMockExecutionContext(AuditAction.VENDEDOR_UPDATED);
    const callHandler = {
      handle: () => throwError(() => new Error('Something went wrong')),
    } as any;

    interceptor.intercept(context, callHandler).subscribe({
      error: () => {
        expect(mockAuditLogService.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  // ═══════════════════════════════════════════════
  //  Handles missing userId gracefully
  // ═══════════════════════════════════════════════

  it('NO llama record() cuando request.user no tiene userId', (done) => {
    mockReflector.getAllAndOverride.mockReturnValue(AuditAction.VENDEDOR_UPDATED);

    const context = createMockExecutionContext(AuditAction.VENDEDOR_UPDATED);
    // Remove userId
    context.switchToHttp().getRequest().user = {};
    const callHandler = createMockCallHandler({ success: true });

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(mockAuditLogService.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  // ═══════════════════════════════════════════════
  //  Skips if no @AuditLog decorator
  // ═══════════════════════════════════════════════

  it('NO llama record() cuando no hay metadata de audit-log', (done) => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const callHandler = createMockCallHandler({ success: true });

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(mockAuditLogService.record).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
