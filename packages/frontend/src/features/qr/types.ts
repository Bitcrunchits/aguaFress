import type { GenerarLinkResponse, GenerarQRResponse, PaginatedResponse } from '@agua/contracts';

export interface VendorQrItem extends GenerarQRResponse {
  id: string;
  activo?: boolean;
}

export interface VendorLinkItem extends GenerarLinkResponse {
  id: string;
  activo?: boolean;
}

export type VendorQrResponse = PaginatedResponse<VendorQrItem>;
export type VendorLinksResponse = PaginatedResponse<VendorLinkItem>;
