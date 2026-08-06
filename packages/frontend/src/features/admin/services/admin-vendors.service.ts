import type {
  SuperAdminAccionResponse,
  SuperAdminVendedorItem,
  SuperAdminVendedorListFilters,
  SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { VendedorEstado } from '@agua/contracts';
import api from '../../../services/api';

export type AdminVendorDetail = SuperAdminVendedorItem;

const DEFAULT_VENDOR_FILTERS = {
  page: 1,
  limit: 20,
} as const;

export async function listAdminVendors(
  filters: SuperAdminVendedorListFilters = DEFAULT_VENDOR_FILTERS
): Promise<SuperAdminVendedorListResponse> {
  const response = await api.get<SuperAdminVendedorListResponse>('/vendedores/list', {
    params: { ...DEFAULT_VENDOR_FILTERS, ...filters },
  });
  return response.data;
}

export async function listPendingAdminVendors(): Promise<SuperAdminVendedorListResponse> {
  return listAdminVendors({ estado: VendedorEstado.PENDIENTE, ...DEFAULT_VENDOR_FILTERS });
}

export async function getAdminVendorById(vendedorId: string): Promise<AdminVendorDetail> {
  const response = await api.get<AdminVendorDetail>(`/vendedores/get-by-id/${vendedorId}`);
  return response.data;
}

export async function changeAdminVendorEstado(
  vendedorId: string,
  estado: VendedorEstado
): Promise<SuperAdminAccionResponse> {
  const response = await api.patch<SuperAdminAccionResponse>(
    `/vendedores/change-estado/${vendedorId}`,
    { estado }
  );
  return response.data;
}
