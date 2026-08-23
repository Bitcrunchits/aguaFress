import type {
  ActivityLogListResponseDTO,
  ActivityLogDetailResponseDTO,
  PaginatedResponse,
  PaginationRequest,
  SuperAdminClienteItem,
  SuperAdminDashboardResponse,
  SuperAdminVendedorItem,
  UserRole,
} from '@agua/contracts';

export type AdminDashboardStats = SuperAdminDashboardResponse;
export type AdminVendedoresResponse = PaginatedResponse<SuperAdminVendedorItem>;
export type AdminClientesResponse = PaginatedResponse<SuperAdminClienteItem>;
export type AdminAuditResponse = ActivityLogListResponseDTO;
export type AdminAuditDetailResponse = ActivityLogDetailResponseDTO;

export type AdminAuditListFilters = Pick<PaginationRequest, 'page' | 'limit'>;

export interface AdminProfileResponse {
  id: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateAdminProfileRequest {
  nombre?: string;
  apellido?: string;
}

export interface AdminQrItem {
  id: string;
  codigo: string;
  activo: boolean;
  expires_at: string;
  created_at: string;
}

export interface AdminLinkItem {
  id: string;
  token: string;
  activo: boolean;
  expires_at: string;
  created_at: string;
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
