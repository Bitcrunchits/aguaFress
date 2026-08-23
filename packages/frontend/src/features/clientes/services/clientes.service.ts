import type {
  ClienteProvidersResponse,
  ClienteProfile,
  ClienteResponse,
  PaginatedResponse,
  PaginationRequest,
  RegisterClientRequest,
  RegisterClientResponse,
  SelectClienteProviderRequest,
  SelectClienteProviderResponse,
  SuperAdminClientesResponse,
} from '@agua/contracts';
import api from '../../../services/api';

export type ClientesListResponse = PaginatedResponse<ClienteResponse> | SuperAdminClientesResponse;
export interface VendedorClientDetail extends ClienteProfile {
  id: string;
  email?: string;
}
export type VendedorClientUpdateRequest = ClienteProfile;
export type RegisterClientByVendorRequest = Omit<RegisterClientRequest, 'token'>;

const DEFAULT_CLIENT_FILTERS = {
  page: 1,
  limit: 20,
} as const;

export async function listClientes(): Promise<ClientesListResponse> {
  const response = await api.get<ClientesListResponse>('/clientes/list', {
    params: DEFAULT_CLIENT_FILTERS,
  });
  return response.data;
}

export async function listVendedorClientPortfolio(
  filters: PaginationRequest = DEFAULT_CLIENT_FILTERS
): Promise<ClientesListResponse> {
  const response = await api.get<ClientesListResponse>('/clientes/cartera', {
    params: { ...DEFAULT_CLIENT_FILTERS, ...filters },
  });
  return response.data;
}

export const listCarteraClientes = listVendedorClientPortfolio;

export async function getOwnClientById(clienteId: string): Promise<VendedorClientDetail> {
  const response = await api.get<VendedorClientDetail>(`/clientes/own/get-by-id/${clienteId}`);
  return response.data;
}

export async function updateOwnClient(
  clienteId: string,
  request: VendedorClientUpdateRequest
): Promise<VendedorClientDetail> {
  const response = await api.patch<VendedorClientDetail>(`/clientes/own/update/${clienteId}`, request);
  return response.data;
}

export async function registerClientByVendor(
  request: RegisterClientByVendorRequest
): Promise<RegisterClientResponse> {
  const response = await api.post<RegisterClientResponse>('/auth/register-client/by-vendor', request);
  return response.data;
}

export async function listClienteProviders(): Promise<ClienteProvidersResponse> {
  const response = await api.get<ClienteProvidersResponse>('/clientes/providers');
  return response.data;
}

export async function selectClienteProvider(
  request: SelectClienteProviderRequest
): Promise<SelectClienteProviderResponse> {
  const response = await api.post<SelectClienteProviderResponse>('/clientes/providers/select', request);
  return response.data;
}
