import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SCOPED_PRODUCT_CATALOG_PORT, type ProductSnapshot, type ScopedProductCatalogPort } from '../products/product-catalog.port';
import { CLOCK, type Clock } from '../common/clock.provider';
import { type AddCartItemRequest, type CartResponse, type DeleteCartItemRequest, type UpdateCartItemRequest } from './cart.dto';
import { cartExpiresAt, PrismaCartRepository, type CartRecord, type CartRepository } from './cart.repository';
import { toCartResponse } from './cart.mapper';
import type { TcpAuthenticatedUser } from '../tcp/tcp-payload';
import { UserRole } from '@agua/contracts';

@Injectable()
export class CartService {
  constructor(
    @Inject(PrismaCartRepository) private readonly repository: CartRepository,
    @Inject(SCOPED_PRODUCT_CATALOG_PORT) private readonly productCatalog: ScopedProductCatalogPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getActiveCart(clienteUserId: string, vendedorId: string): Promise<CartResponse | null> {
    const cart = await this.repository.findActiveByCliente(clienteUserId, vendedorId, this.clock());
    return cart === null ? null : toCartResponse(cart);
  }

  async addItem(user: TcpAuthenticatedUser, request: AddCartItemRequest): Promise<CartResponse> {
    this.assertCliente(user);
    const clienteUserId = user.userId;
    const product = await this.getAvailableProduct(request.productoId, user);
    this.assertProductBelongsToSelectedProvider(product, request.vendedorId);
    this.assertAvailableStock(product, request.cantidad, 0);
    const cart = await this.resolveMutableCart(clienteUserId, request.cartId, request.vendedorId);
    this.assertAvailableStock(product, request.cantidad, quantityInCart(cart, product.id));
    const updatedCart = await this.repository.incrementItemQuantity(
      cart.id,
      product.id,
      product.nombre,
      request.cantidad,
      product.precioFinal,
    );

    return toCartResponse(updatedCart);
  }

  async updateItem(user: TcpAuthenticatedUser, request: UpdateCartItemRequest): Promise<CartResponse> {
    this.assertCliente(user);
    const clienteUserId = user.userId;
    const cart = await this.requireMutableCart(clienteUserId, request.cartId);
    this.assertCartBelongsToVendedor(cart, request.vendedorId);
    this.assertCartHasItem(cart, request.productoId);
    const product = await this.getAvailableProduct(request.productoId, user);
    this.assertCartBelongsToVendedor(cart, product.vendedorId);
    this.assertAvailableStock(product, request.cantidad, 0);
    const updatedCart = await this.repository.replaceItemQuantity(
      cart.id,
      product.id,
      product.nombre,
      request.cantidad,
      product.precioFinal,
    );

    return toCartResponse(updatedCart);
  }

  async deleteItem(user: TcpAuthenticatedUser, request: DeleteCartItemRequest): Promise<CartResponse> {
    this.assertCliente(user);
    const clienteUserId = user.userId;
    const cart = await this.requireMutableCart(clienteUserId, request.cartId);
    this.assertCartBelongsToVendedor(cart, request.vendedorId);
    const updatedCart = await this.repository.deleteItem(cart.id, request.productoId);
    return toCartResponse(updatedCart);
  }

  private async resolveMutableCart(clienteUserId: string, cartId: string | undefined, vendedorId: string): Promise<CartRecord> {
    if (cartId !== undefined) {
      const cart = await this.requireMutableCart(clienteUserId, cartId);
      this.assertCartBelongsToVendedor(cart, vendedorId);
      return cart;
    }

    const activeCart = await this.repository.findActiveByCliente(clienteUserId, vendedorId, this.clock());
    if (activeCart !== null) {
      this.assertCartBelongsToVendedor(activeCart, vendedorId);
      return activeCart;
    }

    const cart = await this.repository.findOrCreateActiveCart(clienteUserId, vendedorId, cartExpiresAt(this.clock()), this.clock());
    this.assertCartBelongsToVendedor(cart, vendedorId);
    return cart;
  }

  private async requireMutableCart(clienteUserId: string, cartId: string): Promise<CartRecord> {
    const cart = await this.repository.findById(cartId);
    if (cart === null) {
      throw new NotFoundException('Cart was not found');
    }

    if (cart.usuarioId !== clienteUserId) {
      throw new ForbiddenException('Cart belongs to another cliente');
    }

    if (cart.expiresAt <= this.clock()) {
      throw new ForbiddenException('Cart is expired');
    }

    return cart;
  }

  private assertCartBelongsToVendedor(cart: CartRecord, vendedorId: string): void {
    if (cart.vendedorId !== vendedorId) {
      throw new ForbiddenException('Cart belongs to another vendedor');
    }
  }

  private assertCliente(user: TcpAuthenticatedUser): void {
    if (user.role !== UserRole.CLIENTE) throw new ForbiddenException('Only clientes can modify carts');
  }

  private assertProductBelongsToSelectedProvider(product: ProductSnapshot, vendedorId: string): void {
    if (product.vendedorId !== vendedorId) {
      throw new ForbiddenException('Product belongs to another vendedor');
    }
  }

  private assertCartHasItem(cart: CartRecord, productoId: string): void {
    if (!cart.items.some((item) => item.productoId === productoId)) {
      throw new NotFoundException('Cart item was not found');
    }
  }

  private async getAvailableProduct(productoId: string, user: TcpAuthenticatedUser): Promise<ProductSnapshot> {
    const product = await this.productCatalog.getScopedSnapshot(productoId, user);
    if (!product.activo || product.stock < 1 || !product.mostrarPrecio) {
      throw new ServiceUnavailableException('Product is unavailable');
    }

    return product;
  }

  private assertAvailableStock(product: ProductSnapshot, requestedQuantity: number, currentQuantity: number): void {
    if (currentQuantity + requestedQuantity > product.stock) {
      throw new ServiceUnavailableException('Product stock is unavailable');
    }
  }
}

function quantityInCart(cart: CartRecord, productoId: string): number {
  const item = cart.items.find((cartItem) => cartItem.productoId === productoId);
  return item?.cantidad ?? 0;
}
