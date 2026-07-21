import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { TcpPayload } from '../tcp/tcp-payload';
import { parseAddCartItemRequest, parseDeleteCartItemRequest, parseGetCartRequest, parseUpdateCartItemRequest, type CartResponse } from './cart.dto';
import { CartService } from './cart.service';

@Controller()
export class CartController {
  constructor(
    private readonly payloadAdapter: TcpPayloadAdapter,
    private readonly cartService: CartService,
  ) {}

  @MessagePattern('cart.get')
  getCart(@Payload() payload: TcpPayload): Promise<CartResponse | null> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.cartService.getActiveCart(user.userId, parseGetCartRequest(payload.query ?? payload.body).vendedorId);
  }

  @MessagePattern('cart.items_add')
  addItem(@Payload() payload: TcpPayload): Promise<CartResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.cartService.addItem(user.userId, parseAddCartItemRequest(payload.body));
  }

  @MessagePattern('cart.items_update')
  updateItem(@Payload() payload: TcpPayload): Promise<CartResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.cartService.updateItem(user.userId, parseUpdateCartItemRequest(payload.body));
  }

  @MessagePattern('cart.items_delete')
  deleteItem(@Payload() payload: TcpPayload): Promise<CartResponse> {
    const user = this.payloadAdapter.requireUser(payload);
    return this.cartService.deleteItem(user.userId, parseDeleteCartItemRequest(payload.body));
  }
}
