import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ListAuditLogsDto } from '../audit-log/dto/list-audit-logs.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientesService } from '../clientes/clientes.service';
import { ListClientesDto } from '../clientes/dto/list-clientes.dto';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { LinkInvitacionService } from '../link-invitacion/link-invitacion.service';
import { ListLinkInvitacionDto } from '../link-invitacion/dto/list-link-invitacion.dto';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { ListQrCodesDto } from '../qr-codes/dto/list-qr-codes.dto';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { VendedoresService } from '../vendedores/vendedores.service';
import { ListVendedoresDto } from '../vendedores/dto/list-vendedores.dto';
import { UpdateVendedorProfileDto } from '../vendedores/dto/update-vendedor-profile.dto';
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

  @MessagePattern('super_admin.dashboard')
  dashboard(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.SUPER_ADMIN);
    return this.superAdminService.getDashboard();
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

  private requireVendedorId(vendedorId: string | undefined): string {
    if (!vendedorId) {
      throw new BadRequestException('vendedorId is required');
    }

    return vendedorId;
  }
}
