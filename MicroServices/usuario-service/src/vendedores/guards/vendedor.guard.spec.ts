import { Test, type TestingModule } from '@nestjs/testing';
import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VendedorGuard } from './vendedor.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VendedorEstado } from '@agua/contracts';

describe('VendedorGuard', () => {
  let guard: VendedorGuard;
  let mockPrisma: { vendedor: { findUnique: jest.Mock } };

  beforeEach(async () => {
    mockPrisma = {
      vendedor: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendedorGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<VendedorGuard>(VendedorGuard);
  });

  const mockContext = (user?: { userId: string; role: string } | null) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('permite acceso si usuario autenticado, rol VENDEDOR y estado activo', async () => {
    mockPrisma.vendedor.findUnique.mockResolvedValue({ estado: VendedorEstado.ACTIVO });

    const result = await guard.canActivate(
      mockContext({ userId: 'u1', role: 'vendedor' }),
    );
    expect(result).toBe(true);
  });

  it('deniega acceso si no hay usuario en request (no autenticado)', async () => {
    const result = await guard.canActivate(mockContext(undefined));
    expect(result).toBe(false);
  });

  it('deniega acceso si el rol es CLIENTE', async () => {
    const result = await guard.canActivate(
      mockContext({ userId: 'u2', role: 'cliente' }),
    );
    expect(result).toBe(false);
  });

  it('deniega acceso si el vendedor está INACTIVO', async () => {
    mockPrisma.vendedor.findUnique.mockResolvedValue({ estado: VendedorEstado.INACTIVO });

    await expect(
      guard.canActivate(mockContext({ userId: 'u1', role: 'vendedor' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deniega acceso si el vendedor está BLOQUEADO', async () => {
    mockPrisma.vendedor.findUnique.mockResolvedValue({ estado: VendedorEstado.BLOQUEADO });

    await expect(
      guard.canActivate(mockContext({ userId: 'u1', role: 'vendedor' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deniega acceso si el vendedor no existe en DB', async () => {
    mockPrisma.vendedor.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(mockContext({ userId: 'u1', role: 'vendedor' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deniega acceso si user es null', async () => {
    const result = await guard.canActivate(mockContext(null));
    expect(result).toBe(false);
  });
});
