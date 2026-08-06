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

export async function listAdminQrCodes(): Promise<AdminQrResponse> {
  const response = await api.get<AdminQrResponse>('/super-admin/qr-codes', {
    params: DEFAULT_PAGE_PARAMS,
  });
  return response.data;
}

export async function listAdminLinks(): Promise<AdminLinksResponse> {
  const response = await api.get<AdminLinksResponse>('/super-admin/link-invitacion', {
    params: DEFAULT_PAGE_PARAMS,
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

  const [qrCodesResult, linksResult] = await Promise.allSettled([
    listAdminQrCodes(),
    listAdminLinks(),
  ]);

  return {
    dashboard,
    vendedores,
    clientes,
    audit,
    qrCodes: qrCodesResult.status === 'fulfilled' ? qrCodesResult.value : emptyPaginated(),
    links: linksResult.status === 'fulfilled' ? linksResult.value : emptyPaginated(),
  };
}
