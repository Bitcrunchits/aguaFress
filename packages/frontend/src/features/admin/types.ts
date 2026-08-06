import type {
  ActivityLogListResponseDTO,
  GenerarLinkResponse,
  GenerarQRResponse,
  PaginatedResponse,
  SuperAdminClienteItem,
  SuperAdminDashboardResponse,
  SuperAdminVendedorItem,
} from '@agua/contracts';

export type AdminDashboardStats = SuperAdminDashboardResponse;
export type AdminVendedoresResponse = PaginatedResponse<SuperAdminVendedorItem>;
export type AdminClientesResponse = PaginatedResponse<SuperAdminClienteItem>;
export type AdminAuditResponse = ActivityLogListResponseDTO;

export interface AdminQrItem extends GenerarQRResponse {
  id: string;
  vendedorId?: string;
  activo?: boolean;
}

export interface AdminLinkItem extends GenerarLinkResponse {
  id: string;
  vendedorId?: string;
  activo?: boolean;
}

export type AdminQrResponse = PaginatedResponse<AdminQrItem>;
export type AdminLinksResponse = PaginatedResponse<AdminLinkItem>;

export interface AdminOverview {
  dashboard: AdminDashboardStats;
  vendedores: AdminVendedoresResponse;
  clientes: AdminClientesResponse;
  audit: AdminAuditResponse;
  qrCodes: AdminQrResponse;
  links: AdminLinksResponse;
}
