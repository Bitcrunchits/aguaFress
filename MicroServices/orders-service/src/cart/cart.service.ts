import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PRODUCT_CATALOG_PORT, type ProductCatalogPort, type ProductSnapshot } from '../products/product-catalog.port';
import { type AddCartItemRequest, type CartResponse, type DeleteCartItemRequest, type UpdateCartItemRequest } from './cart.dto';
import { cartExpiresAt, PrismaCartRepository, type CartRecord, type CartRepository } from './cart.repository';
import { toCartResponse } from './cart.mapper';

type Clock = () => Date;

@Injectable()
export class CartService {
  constructor(
    @Inject(PrismaCartRepository) private readonly repository: CartRepository,
    @Inject(PRODUCT_CATALOG_PORT) private readonly productCatalog: ProductCatalogPort,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getActiveCart(clienteId: string): Promise<CartResponse | null> {
    const cart = await this.repository.findActiveByCliente(clienteId, this.clock());
    return cart === null ? null : toCartResponse(cart);
  }

  async addItem(clienteId: string, request: AddCartItemRequest): Promise<CartResponse> {
    const product = await this.getAvailableProduct(request.productoId);
    const cart = await this.resolveMutableCart(clienteId, request.cartId, product.vendedorId);
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

  async updateItem(clienteId: string, request: UpdateCartItemRequest): Promise<CartResponse> {
    const cart = await this.requireMutableCart(clienteId, request.cartId);
    this.assertCartHasItem(cart, request.productoId);
    const product = await this.getAvailableProduct(request.productoId);
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

  async deleteItem(clienteId: string, request: DeleteCartItemRequest): Promise<CartResponse> {
    const cart = await this.requireMutableCart(clienteId, request.cartId);
    const updatedCart = await this.repository.deleteItem(cart.id, request.productoId);
    return toCartResponse(updatedCart);
  }

  private async resolveMutableCart(clienteId: string, cartId: string | undefined, vendedorId: string): Promise<CartRecord> {
    if (cartId !== undefined) {
      const cart = await this.requireMutableCart(clienteId, cartId);
      this.assertCartBelongsToVendedor(cart, vendedorId);
      return cart;
    }

    const activeCart = await this.repository.findActiveByCliente(clienteId, this.clock());
    if (activeCart !== null) {
      this.assertCartBelongsToVendedor(activeCart, vendedorId);
      return activeCart;
    }

    const cart = await this.repository.findOrCreateActiveCart(clienteId, vendedorId, cartExpiresAt(this.clock()), this.clock());
    this.assertCartBelongsToVendedor(cart, vendedorId);
    return cart;
  }

  private async requireMutableCart(clienteId: string, cartId: string): Promise<CartRecord> {
    const cart = await this.repository.findById(cartId);
    if (cart === null) {
      throw new NotFoundException('Cart was not found');
    }

    if (cart.usuarioId !== clienteId) {
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

  private assertCartHasItem(cart: CartRecord, productoId: string): void {
    if (!cart.items.some((item) => item.productoId === productoId)) {
      throw new NotFoundException('Cart item was not found');
    }
  }

  private async getAvailableProduct(productoId: string): Promise<ProductSnapshot> {
    const product = await this.productCatalog.getSnapshot(productoId);
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
