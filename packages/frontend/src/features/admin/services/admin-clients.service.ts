import type {
  ClienteProviderResponse,
  ClienteProfile,
  PaginationRequest,
  SuperAdminClientesResponse,
} from '@agua/contracts';
import api from '../../../services/api';

export interface AdminClientListFilters extends PaginationRequest {
  search?: string;
}

export interface AdminClientDetail extends ClienteProfile {
  id: string;
  email?: string;
  providers?: readonly ClienteProviderResponse[];
}

export type AdminClientUpdateRequest = ClienteProfile;

export interface AdminClientProviderRequest {
  vendedorId: string;
}

export interface AdminClientReassignResponse {
  clienteId: string;
  vendedorId: string;
  updated: boolean;
}

export interface AdminClientProviderAddResponse {
  clienteId: string;
  vendedorId: string;
  active: boolean;
}

const DEFAULT_CLIENT_FILTERS = {
  page: 1,
  limit: 20,
} as const;

export async function listAdminClients(
  filters: AdminClientListFilters = DEFAULT_CLIENT_FILTERS
): Promise<SuperAdminClientesResponse> {
  const response = await api.get<SuperAdminClientesResponse>('/clientes/list', {
    params: { ...DEFAULT_CLIENT_FILTERS, ...filters },
  });
  return response.data;
}

export async function getAdminClientById(clienteId: string): Promise<AdminClientDetail> {
  const response = await api.get<AdminClientDetail>(`/clientes/get-by-id/${clienteId}`);
  return response.data;
}

export async function updateAdminClient(
  clienteId: string,
  request: AdminClientUpdateRequest
): Promise<AdminClientDetail> {
  const response = await api.patch<AdminClientDetail>(`/clientes/update/${clienteId}`, request);
  return response.data;
}

export async function reassignAdminClient(
  clienteId: string,
  request: AdminClientProviderRequest
): Promise<AdminClientReassignResponse> {
  const response = await api.patch<AdminClientReassignResponse>(
    `/clientes/reassign/${clienteId}`,
    request
  );
  return response.data;
}

export async function addAdminClientProvider(
  clienteId: string,
  request: AdminClientProviderRequest
): Promise<AdminClientProviderAddResponse> {
  const response = await api.post<AdminClientProviderAddResponse>(
    `/clientes/providers/add/${clienteId}`,
    request
  );
  return response.data;
}
