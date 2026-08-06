import type {
  AddCartItemV2Request,
  CartResponse,
  DeleteCartItemV2Request,
  UpdateCartItemV2Request,
} from '@agua/contracts';
import api from '../../../services/api';

export async function getCart(vendedorId: string): Promise<CartResponse> {
  const response = await api.get<CartResponse>('/cart/get', { params: { vendedorId } });
  return response.data;
}

export async function addCartItem(request: AddCartItemV2Request): Promise<CartResponse> {
  const response = await api.post<CartResponse>('/cart/items/add', request);
  return response.data;
}

export async function updateCartItem(request: UpdateCartItemV2Request): Promise<CartResponse> {
  const response = await api.patch<CartResponse>('/cart/items/update', request);
  return response.data;
}

export async function deleteCartItem(request: DeleteCartItemV2Request): Promise<CartResponse> {
  const response = await api.delete<CartResponse>('/cart/items/delete', { data: request });
  return response.data;
}
