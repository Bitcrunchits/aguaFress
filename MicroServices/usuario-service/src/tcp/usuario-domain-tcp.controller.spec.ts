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
  getById: jest.Mock;
  update: jest.Mock;
  reassign: jest.Mock;
  addProvider: jest.Mock;
  listProvidersForClienteUser: jest.Mock;
  selectProviderForClienteUser: jest.Mock;
  getOwnById: jest.Mock;
  updateOwn: jest.Mock;
};

type LinkInvitacionServiceMock = {
  list: jest.Mock;
  listByVendedor: jest.Mock;
  create: jest.Mock;
  deactivateAdmin: jest.Mock;
  deactivate: jest.Mock;
};

type QrCodesServiceMock = {
  list: jest.Mock;
  listByVendedor: jest.Mock;
  create: jest.Mock;
  deactivateAdmin: jest.Mock;
  deactivate: jest.Mock;
};

type SuperAdminServiceMock = {
  getDashboard: jest.Mock;
  getProfile: jest.Mock;
  updateProfile: jest.Mock;
};

type VendedoresServiceMock = {
  list: jest.Mock;
  getMyProfile: jest.Mock;
  updateMyProfile: jest.Mock;
  getById: jest.Mock;
  update: jest.Mock;
  changeEstado: jest.Mock;
};

type VendedorResolverMock = {
  resolve: jest.Mock;
};

function superAdminPayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
  return {
    user: { sub: 'admin-user-id', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
    params: { id: 'entity-id-123' },
    requestId: 'request-1',
    ...overrides,
  };
}

function vendedorPayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
  return {
    user: { sub: 'vendor-user-id', email: 'vendor@test.com', role: UserRole.VENDEDOR },
    params: { id: 'entity-id-123' },
    requestId: 'request-1',
    ...overrides,
  };
}

function clientePayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
  return {
    user: { sub: 'cliente-user-id', email: 'cliente@test.com', role: UserRole.CLIENTE },
    params: { id: 'entity-id-123' },
    requestId: 'request-1',
    ...overrides,
  };
}

describe('UsuarioDomainTcpController', () => {
  let controller: UsuarioDomainTcpController;
  let superAdminService: SuperAdminServiceMock;
  let vendedoresService: VendedoresServiceMock;
  let clientesService: ClientesServiceMock;
  let qrCodesService: QrCodesServiceMock;
  let linkInvitacionService: LinkInvitacionServiceMock;
  let vendedorResolver: VendedorResolverMock;

  beforeEach(() => {
    const auditLogService: AuditLogServiceMock = { findAll: jest.fn() };
    clientesService = {
      list: jest.fn(),
      listOwn: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      reassign: jest.fn(),
      addProvider: jest.fn(),
      listProvidersForClienteUser: jest.fn(),
      selectProviderForClienteUser: jest.fn(),
      getOwnById: jest.fn(),
      updateOwn: jest.fn(),
    };
    linkInvitacionService = {
      list: jest.fn(),
      listByVendedor: jest.fn(),
      create: jest.fn(),
      deactivateAdmin: jest.fn(),
      deactivate: jest.fn(),
    };
    qrCodesService = {
      list: jest.fn(),
      listByVendedor: jest.fn(),
      create: jest.fn(),
      deactivateAdmin: jest.fn(),
      deactivate: jest.fn(),
    };
    superAdminService = {
      getDashboard: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };
    vendedoresService = {
      list: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      changeEstado: jest.fn(),
    };
    vendedorResolver = { resolve: jest.fn() };

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

  describe('auth enforcement', () => {
    it('rejects protected role handlers without payload.user', () => {
      const payload: TcpPayload = { requestId: 'request-1' };

      expect(() => controller.dashboard(payload)).toThrow(UnauthorizedException);
      expect(superAdminService.getDashboard).not.toHaveBeenCalled();
    });

    it('rejects role-restricted super_admin handlers with the wrong role', async () => {
      const payload: TcpPayload = {
        user: { sub: 'cliente-user-id', email: 'cliente@test.com', role: UserRole.CLIENTE },
        params: { id: 'v-id' },
        requestId: 'request-1',
      };

      await expect(controller.listVendedores(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(vendedoresService.list).not.toHaveBeenCalled();
    });

    it('rejects role-restricted vendedor handlers with the wrong role', async () => {
      const payload: TcpPayload = {
        user: { sub: 'admin-user-id', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
        params: { id: 'e-id' },
        requestId: 'request-1',
      };

      await expect(controller.vendorQrList(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(qrCodesService.list).not.toHaveBeenCalled();
    });
  });

  // ─── VENDEDORES ADMIN ───────────────────────────────────────────

  describe('vendedores.get_by_id', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload();
      await expect(controller.getVendedorById(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(vendedoresService.getById).not.toHaveBeenCalled();
    });

    it('calls VendedoresService.getById with the id from params', async () => {
      const expected = { id: 'v-1', nombre: 'Test Vendor' };
      vendedoresService.getById.mockResolvedValue(expected);

      const payload = superAdminPayload({ params: { id: 'v-1' } });
      const result = await controller.getVendedorById(payload);

      expect(vendedoresService.getById).toHaveBeenCalledWith('v-1');
      expect(result).toBe(expected);
    });
  });

  describe('vendedores.update', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload({ body: { empresa: 'NewCo' } });
      await expect(controller.updateVendedor(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(vendedoresService.update).not.toHaveBeenCalled();
    });

    it('validates body and calls VendedoresService.update', async () => {
      const expected = { id: 'v-1', empresa: 'Updated' };
      vendedoresService.update.mockResolvedValue(expected);

      const payload = superAdminPayload({
        params: { id: 'v-1' },
        body: { empresa: 'Updated' },
      });
      const result = await controller.updateVendedor(payload);

      expect(vendedoresService.update).toHaveBeenCalledWith('v-1', expect.objectContaining({ empresa: 'Updated' }));
      expect(result).toBe(expected);
    });
  });

  describe('vendedores.change_estado', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload({ body: { estado: 'activo' } });
      await expect(controller.changeVendedorEstado(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(vendedoresService.changeEstado).not.toHaveBeenCalled();
    });

    it('validates body and calls VendedoresService.changeEstado', async () => {
      const expected = { id: 'v-1', estado: 'activo' };
      vendedoresService.changeEstado.mockResolvedValue(expected);

      const payload = superAdminPayload({
        params: { id: 'v-1' },
        body: { estado: 'activo' },
      });
      const result = await controller.changeVendedorEstado(payload);

      expect(vendedoresService.changeEstado).toHaveBeenCalledWith('v-1', expect.objectContaining({ estado: 'activo' }));
      expect(result).toBe(expected);
    });
  });

  // ─── SUPER ADMIN PROFILE ────────────────────────────────────────

  describe('super_admin.profile', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload();
      await expect(controller.superAdminProfile(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(superAdminService.getProfile).not.toHaveBeenCalled();
    });

    it('calls SuperAdminService.getProfile with userId from JWT', async () => {
      const expected = { id: 'sa-1', email: 'admin@test.com' };
      superAdminService.getProfile.mockResolvedValue(expected);

      const payload = superAdminPayload();
      const result = await controller.superAdminProfile(payload);

      expect(superAdminService.getProfile).toHaveBeenCalledWith('admin-user-id');
      expect(result).toBe(expected);
    });
  });

  describe('super_admin.profile_update', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload({ body: { nombre: 'New' } });
      await expect(controller.superAdminProfileUpdate(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(superAdminService.updateProfile).not.toHaveBeenCalled();
    });

    it('validates body and calls SuperAdminService.updateProfile', async () => {
      const expected = { id: 'sa-1', nombre: 'Admin', apellido: 'User' };
      superAdminService.updateProfile.mockResolvedValue(expected);

      const payload = superAdminPayload({ body: { nombre: 'Admin' } });
      const result = await controller.superAdminProfileUpdate(payload);

      expect(superAdminService.updateProfile).toHaveBeenCalledWith('admin-user-id', { nombre: 'Admin' });
      expect(result).toBe(expected);
    });
  });

  // ─── CLIENTES ADMIN ─────────────────────────────────────────────

  describe('clientes.get_by_id', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload();
      await expect(controller.getClienteById(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.getById).not.toHaveBeenCalled();
    });

    it('calls ClientesService.getById with the id from params', async () => {
      const expected = { id: 'c-1', nombre: 'Test Cliente' };
      clientesService.getById.mockResolvedValue(expected);

      const payload = superAdminPayload({ params: { id: 'c-1' } });
      const result = await controller.getClienteById(payload);

      expect(clientesService.getById).toHaveBeenCalledWith('c-1');
      expect(result).toBe(expected);
    });
  });

  describe('clientes.update', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload({ body: { nombre: 'Updated' } });
      await expect(controller.updateCliente(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.update).not.toHaveBeenCalled();
    });

    it('validates body and calls ClientesService.update', async () => {
      const expected = { id: 'c-1', nombre: 'Updated' };
      clientesService.update.mockResolvedValue(expected);

      const payload = superAdminPayload({
        params: { id: 'c-1' },
        body: { nombre: 'Updated' },
      });
      const result = await controller.updateCliente(payload);

      expect(clientesService.update).toHaveBeenCalledWith('c-1', expect.objectContaining({ nombre: 'Updated' }));
      expect(result).toBe(expected);
    });
  });

  describe('clientes.reassign', () => {
    const UUID = '550e8400-e29b-41d4-a716-446655440000';

    it('requires super_admin role', async () => {
      const payload = vendedorPayload({ body: { vendedorId: UUID } });
      await expect(controller.reassignCliente(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.reassign).not.toHaveBeenCalled();
    });

    it('validates body and calls ClientesService.reassign', async () => {
      const expected = { id: 'c-1', vendedor_id: UUID };
      clientesService.reassign.mockResolvedValue(expected);

      const payload = superAdminPayload({
        params: { id: 'c-1' },
        body: { vendedorId: UUID },
      });
      const result = await controller.reassignCliente(payload);

      expect(clientesService.reassign).toHaveBeenCalledWith('c-1', expect.objectContaining({ vendedorId: UUID }), 'admin-user-id');
      expect(result).toBe(expected);
    });
  });

  describe('clientes.provider_add', () => {
    const UUID = '550e8400-e29b-41d4-a716-446655440000';

    it('requires super_admin role', async () => {
      const payload = vendedorPayload({ body: { vendedorId: UUID } });
      await expect(controller.addClienteProvider(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.addProvider).not.toHaveBeenCalled();
    });

    it('validates body and calls ClientesService.addProvider', async () => {
      const expected = { id: 'c-1', vendedor_id: UUID };
      clientesService.addProvider.mockResolvedValue(expected);

      const payload = superAdminPayload({ params: { id: 'c-1' }, body: { vendedorId: UUID } });
      const result = await controller.addClienteProvider(payload);

      expect(clientesService.addProvider).toHaveBeenCalledWith('c-1', expect.objectContaining({ vendedorId: UUID }), 'admin-user-id');
      expect(result).toBe(expected);
    });
  });

  describe('clientes.providers', () => {
    it('requires cliente role', async () => {
      const payload = vendedorPayload();

      expect(() => controller.listClienteProviders(payload)).toThrow(ForbiddenException);
      expect(clientesService.listProvidersForClienteUser).not.toHaveBeenCalled();
    });

    it('uses JWT userId to list providers for the cliente', async () => {
      const expected = { providers: [{ id: 'v-1', nombre: 'Proveedor', isDefault: true }], requiresSelection: false };
      clientesService.listProvidersForClienteUser.mockResolvedValue(expected);

      const result = await controller.listClienteProviders(clientePayload());

      expect(clientesService.listProvidersForClienteUser).toHaveBeenCalledWith('cliente-user-id');
      expect(result).toBe(expected);
    });
  });

  describe('clientes.providers_select', () => {
    const UUID = '550e8400-e29b-41d4-a716-446655440000';

    it('requires cliente role', async () => {
      const payload = vendedorPayload({ body: { vendedorId: UUID } });

      await expect(controller.selectClienteProvider(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.selectProviderForClienteUser).not.toHaveBeenCalled();
    });

    it('validates body and selects provider using JWT userId', async () => {
      const expected = { selectedProvider: { id: UUID, nombre: 'Proveedor', isDefault: false } };
      clientesService.selectProviderForClienteUser.mockResolvedValue(expected);

      const payload = clientePayload({ body: { vendedorId: UUID } });
      const result = await controller.selectClienteProvider(payload);

      expect(clientesService.selectProviderForClienteUser).toHaveBeenCalledWith('cliente-user-id', UUID);
      expect(result).toBe(expected);
    });
  });

  // ─── CLIENTES VENDOR-SCOPED ─────────────────────────────────────

  describe('clientes.own_get_by_id', () => {
    it('requires vendedor role', async () => {
      const payload = superAdminPayload();
      await expect(controller.getOwnClienteById(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.getOwnById).not.toHaveBeenCalled();
    });

    it('resolves vendedorId and calls ClientesService.getOwnById', async () => {
      vendedorResolver.resolve.mockResolvedValue('vendedor-abc');
      const expected = { id: 'c-1', nombre: 'Own Cliente' };
      clientesService.getOwnById.mockResolvedValue(expected);

      const payload = vendedorPayload({ params: { id: 'c-1' } });
      const result = await controller.getOwnClienteById(payload);

      expect(vendedorResolver.resolve).toHaveBeenCalledWith('vendor-user-id');
      expect(clientesService.getOwnById).toHaveBeenCalledWith('c-1', 'vendedor-abc');
      expect(result).toBe(expected);
    });
  });

  describe('vendedores.resolve_profile_id', () => {
    it('requires vendedor role', async () => {
      await expect(controller.resolveVendedorProfileId(superAdminPayload())).rejects.toBeInstanceOf(ForbiddenException);
      expect(vendedorResolver.resolve).not.toHaveBeenCalled();
    });

    it('resolves the authenticated vendedor user id to the domain vendedorId', async () => {
      vendedorResolver.resolve.mockResolvedValue('vendedor-abc');

      await expect(controller.resolveVendedorProfileId(vendedorPayload())).resolves.toEqual({ vendedorId: 'vendedor-abc' });

      expect(vendedorResolver.resolve).toHaveBeenCalledWith('vendor-user-id');
    });
  });

  describe('clientes.own_update', () => {
    it('requires vendedor role', async () => {
      const payload = superAdminPayload({ body: { nombre: 'New' } });
      await expect(controller.updateOwnCliente(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(clientesService.updateOwn).not.toHaveBeenCalled();
    });

    it('resolves vendedorId, validates body and calls ClientesService.updateOwn', async () => {
      vendedorResolver.resolve.mockResolvedValue('vendedor-abc');
      const expected = { id: 'c-1', nombre: 'Updated Own' };
      clientesService.updateOwn.mockResolvedValue(expected);

      const payload = vendedorPayload({
        params: { id: 'c-1' },
        body: { nombre: 'Updated Own' },
      });
      const result = await controller.updateOwnCliente(payload);

      expect(vendedorResolver.resolve).toHaveBeenCalledWith('vendor-user-id');
      expect(clientesService.updateOwn).toHaveBeenCalledWith(
        'c-1',
        'vendedor-abc',
        expect.objectContaining({ nombre: 'Updated Own' }),
      );
      expect(result).toBe(expected);
    });
  });

  // ─── QR CODES ADMIN ─────────────────────────────────────────────

  describe('qr.admin_deactivate', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload();
      await expect(controller.adminDeactivateQr(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(qrCodesService.deactivateAdmin).not.toHaveBeenCalled();
    });

    it('calls QrCodesService.deactivateAdmin with the id from params', async () => {
      qrCodesService.deactivateAdmin.mockResolvedValue(undefined);

      const payload = superAdminPayload({ params: { id: 'qr-1' } });
      await controller.adminDeactivateQr(payload);

      expect(qrCodesService.deactivateAdmin).toHaveBeenCalledWith('qr-1', 'admin-user-id');
    });
  });

  describe('qr.vendor_deactivate', () => {
    it('requires vendedor role', async () => {
      const payload = superAdminPayload();
      await expect(controller.vendorDeactivateQr(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(qrCodesService.deactivate).not.toHaveBeenCalled();
    });

    it('resolves vendedorId and calls QrCodesService.deactivate', async () => {
      vendedorResolver.resolve.mockResolvedValue('vendedor-abc');
      qrCodesService.deactivate.mockResolvedValue(undefined);

      const payload = vendedorPayload({ params: { id: 'qr-1' } });
      await controller.vendorDeactivateQr(payload);

      expect(vendedorResolver.resolve).toHaveBeenCalledWith('vendor-user-id');
      expect(qrCodesService.deactivate).toHaveBeenCalledWith('qr-1', 'vendedor-abc', 'vendor-user-id');
    });
  });

  // ─── LINK INVITACION ADMIN ──────────────────────────────────────

  describe('link_invitacion.admin_deactivate', () => {
    it('requires super_admin role', async () => {
      const payload = vendedorPayload();
      await expect(controller.adminDeactivateLink(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(linkInvitacionService.deactivateAdmin).not.toHaveBeenCalled();
    });

    it('calls LinkInvitacionService.deactivateAdmin with the id from params', async () => {
      linkInvitacionService.deactivateAdmin.mockResolvedValue(undefined);

      const payload = superAdminPayload({ params: { id: 'link-1' } });
      await controller.adminDeactivateLink(payload);

      expect(linkInvitacionService.deactivateAdmin).toHaveBeenCalledWith('link-1', 'admin-user-id');
    });
  });

  describe('link_invitacion.vendor_deactivate', () => {
    it('requires vendedor role', async () => {
      const payload = superAdminPayload();
      await expect(controller.vendorDeactivateLink(payload)).rejects.toBeInstanceOf(ForbiddenException);
      expect(linkInvitacionService.deactivate).not.toHaveBeenCalled();
    });

    it('resolves vendedorId and calls LinkInvitacionService.deactivate', async () => {
      vendedorResolver.resolve.mockResolvedValue('vendedor-abc');
      linkInvitacionService.deactivate.mockResolvedValue(undefined);

      const payload = vendedorPayload({ params: { id: 'link-1' } });
      await controller.vendorDeactivateLink(payload);

      expect(vendedorResolver.resolve).toHaveBeenCalledWith('vendor-user-id');
      expect(linkInvitacionService.deactivate).toHaveBeenCalledWith('link-1', 'vendedor-abc', 'vendor-user-id');
    });
  });

  // ─── EXISTING TESTS (preserved) ─────────────────────────────────

  it('handles super_admin.dashboard with a SUPER_ADMIN payload.user', () => {
    const payload: TcpPayload = {
      user: { sub: 'admin-user-id', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
      requestId: 'request-1',
    };
    const expected = { users: 10 };
    superAdminService.getDashboard.mockReturnValue(expected);

    const result = controller.dashboard(payload);

    expect(superAdminService.getDashboard).toHaveBeenCalledWith();
    expect(result).toBe(expected);
  });
});
