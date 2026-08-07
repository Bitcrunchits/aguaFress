import type { PaginatedResponse } from '@agua/contracts';
import api from '../../../services/api';
import type {
  AdminAuditResponse,
  AdminClientesResponse,
  AdminDashboardStats,
  AdminLinksResponse,
  AdminOverview,
  AdminQrResponse,
  AdminVendedoresResponse,
} from '../types';

const DEFAULT_PAGE_PARAMS = {
  page: 1,
  limit: 5,
} as const;

const DEFAULT_QR_LINK_PARAMS = {
  page: 1,
  limit: 20,
} as const;

export interface AdminVendorScopedListParams {
  vendedorId: string;
  page?: number;
  limit?: number;
}

function emptyPaginated<T>(): PaginatedResponse<T> {
  return {
    data: [],
    pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
  };
}

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const response = await api.get<AdminDashboardStats>('/super-admin/dashboard');
  return response.data;
}

export async function listAdminVendedores(): Promise<AdminVendedoresResponse> {
  const response = await api.get<AdminVendedoresResponse>('/vendedores/list', {
    params: DEFAULT_PAGE_PARAMS,
  });
  return response.data;
}

export async function listAdminClientes(): Promise<AdminClientesResponse> {
  const response = await api.get<AdminClientesResponse>('/clientes/list', {
    params: DEFAULT_PAGE_PARAMS,
  });
  return response.data;
}

export async function listAdminAudit(): Promise<AdminAuditResponse> {
  const response = await api.get<AdminAuditResponse>('/activity-logs/list', {
    params: DEFAULT_PAGE_PARAMS,
  });
  return response.data;
}

function assertSelectedVendor(vendedorId: string): void {
  if (!vendedorId.trim()) {
    throw new Error('Debe seleccionar un vendedor');
  }
}

export async function listAdminQrCodes(params: AdminVendorScopedListParams): Promise<AdminQrResponse> {
  assertSelectedVendor(params.vendedorId);
  const response = await api.get<AdminQrResponse>('/super-admin/qr-codes', {
    params: { ...DEFAULT_QR_LINK_PARAMS, ...params },
  });
  return response.data;
}

export async function listAdminLinks(params: AdminVendorScopedListParams): Promise<AdminLinksResponse> {
  assertSelectedVendor(params.vendedorId);
  const response = await api.get<AdminLinksResponse>('/super-admin/link-invitacion', {
    params: { ...DEFAULT_QR_LINK_PARAMS, ...params },
  });
  return response.data;
}

export async function deactivateAdminQrCode(id: string): Promise<void> {
  await api.patch(`/qr/admin/deactivate/${id}`);
}

export async function deactivateAdminLink(id: string): Promise<void> {
  await api.patch(`/link-invitacion/admin/deactivate/${id}`);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [dashboard, vendedores, clientes, audit] = await Promise.all([
    getAdminDashboard(),
    listAdminVendedores(),
    listAdminClientes(),
    listAdminAudit(),
  ]);

  return {
    dashboard,
    vendedores,
    clientes,
    audit,
    qrCodes: emptyPaginated(),
    links: emptyPaginated(),
  };
}
