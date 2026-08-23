import type {
  CategoriaResponse,
  CreateProductRequest,
  MarcaResponse,
  PaginatedResponse,
  ProductListFilters,
  ProductResponse,
  UpdateProductRequest,
} from '@agua/contracts';
import api from '../../../services/api';

export type ProductsListResponse = PaginatedResponse<ProductResponse>;
export type ProductFilters = ProductListFilters;

export interface ProductDeletedResponse {
  id: string;
  deleted: boolean;
}

export async function listProducts(filters: ProductFilters = { page: 1, limit: 20 }): Promise<ProductsListResponse> {
  const response = await api.get<ProductsListResponse>('/products/list', {
    params: filters,
  });

  return response.data;
}

export async function listCategories(vendedorId?: string): Promise<CategoriaResponse[]> {
  const response = await api.get<CategoriaResponse[]>('/categories/list', {
    params: vendedorId ? { vendedorId } : undefined,
  });
  return response.data;
}

export async function listBrands(vendedorId?: string): Promise<MarcaResponse[]> {
  const response = await api.get<MarcaResponse[]>('/brands/list', {
    params: vendedorId ? { vendedorId } : undefined,
  });
  return response.data;
}

export async function createProduct(request: CreateProductRequest): Promise<ProductResponse> {
  const response = await api.post<ProductResponse>('/products/create', request);

  return response.data;
}

export async function updateProduct(id: string, request: UpdateProductRequest): Promise<ProductResponse> {
  const response = await api.patch<ProductResponse>('/products/update', request, {
    params: { id },
  });

  return response.data;
}

export async function deleteProduct(id: string): Promise<ProductDeletedResponse> {
  const response = await api.delete<ProductDeletedResponse>('/products/delete', {
    params: { id },
  });

  return response.data;
}
