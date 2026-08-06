import type {
  ClienteProvidersResponse,
  ClienteResponse,
  PaginatedResponse,
  SelectClienteProviderRequest,
  SelectClienteProviderResponse,
  SuperAdminClientesResponse,
} from '@agua/contracts';
import api from '../../../services/api';

export type ClientesListResponse = PaginatedResponse<ClienteResponse> | SuperAdminClientesResponse;

export async function listClientes(): Promise<ClientesListResponse> {
  const response = await api.get<ClientesListResponse>('/clientes/list', {
    params: { page: 1, limit: 20 },
  });
  return response.data;
}

export async function listCarteraClientes(): Promise<ClientesListResponse> {
  const response = await api.get<ClientesListResponse>('/clientes/cartera', {
    params: { page: 1, limit: 20 },
  });
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
