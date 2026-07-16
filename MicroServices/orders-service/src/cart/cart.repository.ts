import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export interface CartItemRecord {
  readonly id: string;
  readonly productoId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export interface CartRecord {
  readonly id: string;
  readonly usuarioId: string;
  readonly vendedorId: string;
  readonly expiresAt: Date;
  readonly items: readonly CartItemRecord[];
}

export interface CartRepository {
  findActiveByCliente(clienteId: string, now: Date): Promise<CartRecord | null>;
  findById(cartId: string): Promise<CartRecord | null>;
  findOrCreateActiveCart(clienteId: string, vendedorId: string, expiresAt: Date, now: Date): Promise<CartRecord>;
  incrementItemQuantity(cartId: string, productoId: string, nombre: string, cantidad: number, precioUnitario: number): Promise<CartRecord>;
  replaceItemQuantity(cartId: string, productoId: string, nombre: string, cantidad: number, precioUnitario: number): Promise<CartRecord>;
  deleteItem(cartId: string, productoId: string): Promise<CartRecord>;
}

const CART_WITH_ITEMS = {
  items: true,
} satisfies Prisma.CartInclude;

type PrismaCartWithItems = Prisma.CartGetPayload<{ include: typeof CART_WITH_ITEMS }>;

interface DecimalLike {
  toNumber(): number;
}

const CART_TTL_HOURS = 24;

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCliente(clienteId: string, now: Date): Promise<CartRecord | null> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        usuario_id: clienteId,
        active_cart_key: clienteId,
        expires_at: { gt: now },
      },
      include: CART_WITH_ITEMS,
      orderBy: { updated_at: 'desc' },
    });

    return cart === null ? null : mapCart(cart);
  }

  async findById(cartId: string): Promise<CartRecord | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: CART_WITH_ITEMS,
    });

    return cart === null ? null : mapCart(cart);
  }

  async findOrCreateActiveCart(clienteId: string, vendedorId: string, expiresAt: Date, now: Date): Promise<CartRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.cart.updateMany({
          where: {
            usuario_id: clienteId,
            active_cart_key: clienteId,
            expires_at: { lte: now },
          },
          data: { active_cart_key: null },
        });

        const activeCart = await tx.cart.findFirst({
          where: {
            usuario_id: clienteId,
            active_cart_key: clienteId,
            expires_at: { gt: now },
          },
          include: CART_WITH_ITEMS,
          orderBy: { updated_at: 'desc' },
        });

        if (activeCart !== null) {
          return mapCart(activeCart);
        }

        const cart = await tx.cart.create({
          data: {
            usuario_id: clienteId,
            vendedor_id: vendedorId,
            expires_at: expiresAt,
            active_cart_key: clienteId,
          },
          include: CART_WITH_ITEMS,
        });

        return mapCart(cart);
      });
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const activeCart = await this.findActiveByCliente(clienteId, now);
      if (activeCart === null) {
        throw error;
      }

      return activeCart;
    }
  }

  async incrementItemQuantity(
    cartId: string,
    productoId: string,
    nombre: string,
    cantidad: number,
    precioUnitario: number,
  ): Promise<CartRecord> {
    await this.prisma.cartItem.upsert({
      where: {
        cart_id_producto_id: {
          cart_id: cartId,
          producto_id: productoId,
        },
      },
      update: {
        nombre,
        cantidad: { increment: cantidad },
        precio_unitario: precioUnitario,
      },
      create: {
        cart_id: cartId,
        producto_id: productoId,
        nombre,
        cantidad,
        precio_unitario: precioUnitario,
      },
    });

    return this.findByIdOrThrow(cartId);
  }

  async replaceItemQuantity(
    cartId: string,
    productoId: string,
    nombre: string,
    cantidad: number,
    precioUnitario: number,
  ): Promise<CartRecord> {
    await this.prisma.cartItem.upsert({
      where: {
        cart_id_producto_id: {
          cart_id: cartId,
          producto_id: productoId,
        },
      },
      update: {
        nombre,
        cantidad,
        precio_unitario: precioUnitario,
      },
      create: {
        cart_id: cartId,
        producto_id: productoId,
        nombre,
        cantidad,
        precio_unitario: precioUnitario,
      },
    });

    return this.findByIdOrThrow(cartId);
  }

  async deleteItem(cartId: string, productoId: string): Promise<CartRecord> {
    await this.prisma.cartItem.deleteMany({
      where: {
        cart_id: cartId,
        producto_id: productoId,
      },
    });

    return this.findByIdOrThrow(cartId);
  }

  private async findByIdOrThrow(cartId: string): Promise<CartRecord> {
    const cart = await this.findById(cartId);
    if (cart === null) {
      throw new Error(`Cart ${cartId} was not found after mutation`);
    }

    return cart;
  }
}

export function cartExpiresAt(createdAt: Date): Date {
  const expiresAt = new Date(createdAt);
  expiresAt.setHours(expiresAt.getHours() + CART_TTL_HOURS);
  return expiresAt;
}

function mapCart(cart: PrismaCartWithItems): CartRecord {
  return {
    id: cart.id,
    usuarioId: cart.usuario_id,
    vendedorId: cart.vendedor_id,
    expiresAt: cart.expires_at,
    items: cart.items.map((item) => ({
      id: item.id,
      productoId: item.producto_id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: decimalToNumber(item.precio_unitario),
    })),
  };
}

function decimalToNumber(value: Prisma.Decimal | DecimalLike | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
