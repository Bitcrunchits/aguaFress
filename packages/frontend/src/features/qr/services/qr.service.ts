import type { GenerarLinkResponse, GenerarQRResponse } from '@agua/contracts';
import api from '../../../services/api';
import type { VendorLinksResponse, VendorQrResponse } from '../types';

const DEFAULT_PAGE_PARAMS = {
  page: 1,
  limit: 20,
} as const;

export async function listVendorQrCodes(): Promise<VendorQrResponse> {
  const response = await api.get<VendorQrResponse>('/qr/vendor/list', { params: DEFAULT_PAGE_PARAMS });
  return response.data;
}

export async function createVendorQrCode(): Promise<GenerarQRResponse> {
  const response = await api.post<GenerarQRResponse>('/qr/vendor/create');
  return response.data;
}

export async function deactivateVendorQrCode(id: string): Promise<void> {
  await api.patch(`/qr/vendor/deactivate/${id}`);
}

export async function listVendorLinks(): Promise<VendorLinksResponse> {
  const response = await api.get<VendorLinksResponse>('/link-invitacion/vendor/list', { params: DEFAULT_PAGE_PARAMS });
  return response.data;
}

export async function createVendorLink(): Promise<GenerarLinkResponse> {
  const response = await api.post<GenerarLinkResponse>('/link-invitacion/vendor/create');
  return response.data;
}

export async function deactivateVendorLink(id: string): Promise<void> {
  await api.patch(`/link-invitacion/vendor/deactivate/${id}`);
}
