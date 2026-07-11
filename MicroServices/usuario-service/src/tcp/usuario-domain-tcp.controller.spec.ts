import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { UsuarioDomainTcpController } from './usuario-domain-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { ClientesService } from '../clientes/clientes.service';
import type { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import type { LinkInvitacionService } from '../link-invitacion/link-invitacion.service';
import type { QrCodesService } from '../qr-codes/qr-codes.service';
import type { SuperAdminService } from '../super-admin/super-admin.service';
import type { VendedoresService } from '../vendedores/vendedores.service';
import type { TcpPayload } from './tcp-payload';

type AuditLogServiceMock = {
  findAll: jest.Mock;
};

type ClientesServiceMock = {
  list: jest.Mock;
  listOwn: jest.Mock;
};

type LinkInvitacionServiceMock = {
  list: jest.Mock;
  listByVendedor: jest.Mock;
  create: jest.Mock;
};

type QrCodesServiceMock = {
  list: jest.Mock;
  listByVendedor: jest.Mock;
  create: jest.Mock;
};

type SuperAdminServiceMock = {
  getDashboard: jest.Mock;
};

type VendedoresServiceMock = {
  list: jest.Mock;
  getMyProfile: jest.Mock;
  updateMyProfile: jest.Mock;
};

type VendedorResolverMock = {
  resolve: jest.Mock;
};

describe('UsuarioDomainTcpController auth', () => {
  let controller: UsuarioDomainTcpController;
  let superAdminService: SuperAdminServiceMock;
  let vendedoresService: VendedoresServiceMock;

  beforeEach(() => {
    const auditLogService: AuditLogServiceMock = { findAll: jest.fn() };
    const clientesService: ClientesServiceMock = { list: jest.fn(), listOwn: jest.fn() };
    const linkInvitacionService: LinkInvitacionServiceMock = {
      list: jest.fn(),
      listByVendedor: jest.fn(),
      create: jest.fn(),
    };
    const qrCodesService: QrCodesServiceMock = {
      list: jest.fn(),
      listByVendedor: jest.fn(),
      create: jest.fn(),
    };
    superAdminService = { getDashboard: jest.fn() };
    vendedoresService = {
      list: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
    };
    const vendedorResolver: VendedorResolverMock = { resolve: jest.fn() };

    controller = new UsuarioDomainTcpController(
      auditLogService as unknown as AuditLogService,
      clientesService as unknown as ClientesService,
      linkInvitacionService as unknown as LinkInvitacionService,
      qrCodesService as unknown as QrCodesService,
      superAdminService as unknown as SuperAdminService,
      vendedoresService as unknown as VendedoresService,
      vendedorResolver as unknown as VendedorResolver,
      new TcpPayloadAdapter(),
    );
  });

  it('rejects protected role handlers without payload.user', () => {
    const payload: TcpPayload = {
      requestId: 'request-1',
    };

    expect(() => controller.dashboard(payload)).toThrow(UnauthorizedException);
    expect(superAdminService.getDashboard).not.toHaveBeenCalled();
  });

  it('rejects role-restricted handlers with the wrong role', async () => {
    const payload: TcpPayload = {
      user: {
        sub: 'cliente-user-id',
        email: 'cliente@test.com',
        role: UserRole.CLIENTE,
      },
      requestId: 'request-1',
    };

    await expect(controller.listVendedores(payload)).rejects.toBeInstanceOf(ForbiddenException);
    expect(vendedoresService.list).not.toHaveBeenCalled();
  });

  it('handles super_admin.dashboard with a SUPER_ADMIN payload.user', () => {
    const payload: TcpPayload = {
      user: {
        sub: 'admin-user-id',
        email: 'admin@test.com',
        role: UserRole.SUPER_ADMIN,
      },
      requestId: 'request-1',
    };
    const expected = { users: 10 };
    superAdminService.getDashboard.mockReturnValue(expected);

    const result = controller.dashboard(payload);

    expect(superAdminService.getDashboard).toHaveBeenCalledWith();
    expect(result).toBe(expected);
  });
});
