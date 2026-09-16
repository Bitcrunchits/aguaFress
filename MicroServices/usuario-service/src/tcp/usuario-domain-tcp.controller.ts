import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ListAuditLogsDto } from '../audit-log/dto/list-audit-logs.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientesService } from '../clientes/clientes.service';
import { ListClientesDto } from '../clientes/dto/list-clientes.dto';
import { ReasignarVendedorDto } from '../clientes/dto/reasignar-vendedor.dto';
import { UpdateClienteDto } from '../clientes/dto/update-cliente.dto';
import { UpdateClienteVendedorDto } from '../clientes/dto/update-cliente-vendedor.dto';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { LinkInvitacionService } from '../link-invitacion/link-invitacion.service';
import { ListLinkInvitacionDto } from '../link-invitacion/dto/list-link-invitacion.dto';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { ListQrCodesDto } from '../qr-codes/dto/list-qr-codes.dto';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { UpdateSuperAdminProfileDto } from '../super-admin/dto/update-super-admin.dto';
import { ChangeEstadoDto } from '../vendedores/dto/change-estado.dto';
import { ListVendedoresDto } from '../vendedores/dto/list-vendedores.dto';
// import { UpdateVendedorDto } from '../vendedores/dto/update-vendedor.dto'; // deprecated: vendor self-manages via profile/update
import { UpdateVendedorProfileDto } from '../vendedores/dto/update-vendedor-profile.dto';
import { VendedoresService } from '../vendedores/vendedores.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

@Controller()
@Public()
export class UsuarioDomainTcpController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly clientesService: ClientesService,
    private readonly linkInvitacionService: LinkInvitacionService,
    private readonly qrCodesService: QrCodesService,
    private readonly superAdminService: SuperAdminService,
    private readonly vendedoresService: VendedoresService,
    private readonly vendedorResolver: VendedorResolver,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  // ─── VENDEDORES ADMIN ───────────────────────────────────────────

  @MessagePattern('vendedores.list')
  async listVendedores(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.query(payload, ListVendedoresDto);
    return this.vendedoresService.list(dto);
  }

  @MessagePattern('vendedores.profile')
  vendedorProfile(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    return this.vendedoresService.getMyProfile(this.payloadAdapter.userId(payload));
  }

  @MessagePattern('vendedores.profile_update')
  async updateVendedorProfile(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const dto = await this.payloadAdapter.body(payload, UpdateVendedorProfileDto);
    return this.vendedoresService.updateMyProfile(this.payloadAdapter.userId(payload), dto);
  }

  @MessagePattern('vendedores.resolve_profile_id')
  async resolveVendedorProfileId(@Payload() payload: TcpPayload): Promise<{ vendedorId: string }> {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const vendedorId = await this.vendedorResolver.resolve(this.payloadAdapter.userId(payload));
    return { vendedorId };
  }

  @MessagePattern('vendedores.resolve_active_profile_id')
  async resolveActiveVendedorProfileId(@Payload() payload: TcpPayload): Promise<{ vendedorId: string }> {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const vendedorId = await this.vendedorResolver.resolveActive(this.payloadAdapter.userId(payload));
    return { vendedorId };
  }

  @MessagePattern('vendedores.get_by_id')
  async getVendedorById(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.vendedoresService.getById(this.requireParamId(payload));
  }

  // @MessagePattern('vendedores.update') // deprecated: vendor self-manages via profile/update
  // async updateVendedor(@Payload() payload: TcpPayload) {
  //   this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
  //   const dto = await this.payloadAdapter.body(payload, UpdateVendedorDto);
  //   return this.vendedoresService.update(this.requireParamId(payload), dto);
  // }

  @MessagePattern('vendedores.change_estado')
  async changeVendedorEstado(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.body(payload, ChangeEstadoDto);
    return this.vendedoresService.changeEstado(this.requireParamId(payload), dto);
  }

  // ─── SUPER ADMIN PROFILE ────────────────────────────────────────

  @MessagePattern('super_admin.dashboard')
  dashboard(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.superAdminService.getDashboard();
  }

  @MessagePattern('super_admin.profile')
  async superAdminProfile(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.superAdminService.getProfile(this.payloadAdapter.userId(payload));
  }

  @MessagePattern('super_admin.profile_update')
  async superAdminProfileUpdate(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.body(payload, UpdateSuperAdminProfileDto);
    return this.superAdminService.updateProfile(this.payloadAdapter.userId(payload), dto);
  }

  @MessagePattern('super_admin.audit_log')
  async auditLog(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.query(payload, ListAuditLogsDto);
    return this.auditLogService.findAll(dto);
  }

  @MessagePattern('super_admin.qr_codes')
  async adminQrCodes(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.query(payload, ListQrCodesDto);
    return this.qrCodesService.listByVendedor(this.requireVendedorId(dto.vendedorId), dto);
  }

  @MessagePattern('super_admin.link_invitacion')
  async adminLinkInvitacion(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.query(payload, ListLinkInvitacionDto);
    return this.linkInvitacionService.listByVendedor(this.requireVendedorId(dto.vendedorId), dto);
  }

  @MessagePattern('super_admin.vendedores')
  async adminVendedores(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.query(payload, ListVendedoresDto);
    return this.vendedoresService.list(dto);
  }

  // ─── CLIENTES ADMIN ─────────────────────────────────────────────

  @MessagePattern('clientes.list')
  async listClientes(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.query(payload, ListClientesDto);
    return this.clientesService.list(dto);
  }

  @MessagePattern('clientes.cartera')
  async carteraClientes(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    const dto = await this.payloadAdapter.query(payload, ListClientesDto);
    return this.clientesService.listOwn(vendedorId, dto);
  }

  @MessagePattern('clientes.get_by_id')
  async getClienteById(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.clientesService.getById(this.requireParamId(payload));
  }

  @MessagePattern('clientes.update')
  async updateCliente(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.body(payload, UpdateClienteDto);
    return this.clientesService.update(this.requireParamId(payload), dto);
  }

  @MessagePattern('clientes.reassign')
  async reassignCliente(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.body(payload, ReasignarVendedorDto);
    return this.clientesService.reassign(this.requireParamId(payload), dto, this.payloadAdapter.userId(payload));
  }

  @MessagePattern('clientes.provider_add')
  async addClienteProvider(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const dto = await this.payloadAdapter.body(payload, ReasignarVendedorDto);
    return this.clientesService.addProvider(this.requireParamId(payload), dto, this.payloadAdapter.userId(payload));
  }

  @MessagePattern('clientes.providers')
  listClienteProviders(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.CLIENTE);
    return this.clientesService.listProvidersForClienteUser(this.payloadAdapter.userId(payload));
  }

  @MessagePattern('clientes.providers_select')
  async selectClienteProvider(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.CLIENTE);
    const dto = await this.payloadAdapter.body(payload, ReasignarVendedorDto);
    return this.clientesService.selectProviderForClienteUser(this.payloadAdapter.userId(payload), dto.vendedorId);
  }

  // ─── CLIENTES VENDOR-SCOPED ─────────────────────────────────────

  @MessagePattern('clientes.own_get_by_id')
  async getOwnClienteById(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    return this.clientesService.getOwnById(this.requireParamId(payload), vendedorId);
  }

  @MessagePattern('clientes.own_update')
  async updateOwnCliente(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    const dto = await this.payloadAdapter.body(payload, UpdateClienteVendedorDto);
    return this.clientesService.updateOwn(this.requireParamId(payload), vendedorId, dto);
  }

  // ─── QR CODES ───────────────────────────────────────────────────

  @MessagePattern('qr.vendor_list')
  async vendorQrList(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    const dto = await this.payloadAdapter.query(payload, ListQrCodesDto);
    return this.qrCodesService.list(vendedorId, dto);
  }

  @MessagePattern('qr.vendor_create')
  async vendorQrCreate(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    const qr = await this.qrCodesService.create(vendedorId, userId);
    return {
      qrCode: qr.codigo,
      url: `https://agua.app/invitar/${qr.codigo}`,
      expiresAt: qr.expires_at.toISOString(),
    };
  }

  @MessagePattern('qr.admin_deactivate')
  async adminDeactivateQr(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const actorUserId = this.payloadAdapter.userId(payload);
    return this.qrCodesService.deactivateAdmin(this.requireParamId(payload), actorUserId);
  }

  @MessagePattern('qr.vendor_deactivate')
  async vendorDeactivateQr(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const actorUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(actorUserId);
    return this.qrCodesService.deactivate(this.requireParamId(payload), vendedorId, actorUserId);
  }

  // ─── LINK INVITACION ────────────────────────────────────────────

  @MessagePattern('link_invitacion.vendor_list')
  async vendorLinkList(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    const dto = await this.payloadAdapter.query(payload, ListLinkInvitacionDto);
    return this.linkInvitacionService.list(vendedorId, dto);
  }

  @MessagePattern('link_invitacion.vendor_create')
  async vendorLinkCreate(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const userId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(userId);
    const link = await this.linkInvitacionService.create(vendedorId, userId);
    return {
      linkUrl: `https://agua.app/invitar/${link.token}`,
      token: link.token,
      expiresAt: link.expires_at.toISOString(),
    };
  }

  @MessagePattern('link_invitacion.admin_deactivate')
  async adminDeactivateLink(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    const actorUserId = this.payloadAdapter.userId(payload);
    return this.linkInvitacionService.deactivateAdmin(this.requireParamId(payload), actorUserId);
  }

  @MessagePattern('link_invitacion.vendor_deactivate')
  async vendorDeactivateLink(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const actorUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolve(actorUserId);
    return this.linkInvitacionService.deactivate(this.requireParamId(payload), vendedorId, actorUserId);
  }

  // ─── HELPERS ────────────────────────────────────────────────────

  private requireParamId(payload: TcpPayload): string {
    const id = payload.params?.id;
    if (!id) {
      throw new BadRequestException('Entity id is required in URL path: /api/v1/:service/:action/:id');
    }

    return id;
  }

  private requireVendedorId(vendedorId: string | undefined): string {
    if (!vendedorId) {
      throw new BadRequestException('vendedorId is required');
    }

    return vendedorId;
  }
}
