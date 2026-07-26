import { BadRequestException, Controller, ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { ListProductsDto } from '../products/dto/list-products.dto';
import { IdQueryDto } from '../common/dto/id-query.dto';
import { SearchProductDto } from '../products/dto/search-product.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import {
  VENDEDOR_PROFILE_RESOLVER_PORT,
  type VendedorProfileResolverPort,
} from '../common/usuario-client/vendedor-profile-resolver.port';
import {
  CLIENTE_VENDEDOR_RESOLVER_PORT,
  type ClienteVendedorResolverPort,
} from '../common/usuario-client/cliente-vendedor-resolver.port';
import type { TcpPayload } from './tcp-payload';

/**
 * Scoping de seguridad:
 * - VENDEDOR: solo ve/modifica sus propios productos
 * - CLIENTE: solo ve productos de su proveedor (cartera)
 * - SUPER_ADMIN: acceso total
 * - Sin auth: list/search devuelven vacío, get devuelve 404
 *
 * NOTA sobre routing: el gateway usa rutas de "acción" (:action(.*) comodín +
 * match exacto contra ACTION_REGISTRY), NO rutas REST con :id dinámico.
 * `params` que arma el gateway siempre es { service, action } — nunca trae
 * el id del recurso. Por eso get/update/delete leen `id` desde `query`,
 * ej. GET /v1/products/get?id=xxx — no /v1/products/xxx.
 *
 * NOTA sobre vendedorId: modelo-datos.md v1.4 confirma que `vendedor_id`
 * debe ser `VENDEDOR.id`, no `AUTH_USER.id` (el `sub` del JWT). Se resuelve
 * vía VendedorProfileResolverPort.
 */
@Controller()
export class ProductsTcpController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly payloadAdapter: TcpPayloadAdapter,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
    private readonly vendedorResolver: VendedorProfileResolverPort,
    @Inject(CLIENTE_VENDEDOR_RESOLVER_PORT)
    private readonly clienteVendedorResolver: ClienteVendedorResolverPort,
  ) {}

  // ─── Helper: resuelve vendedorId según rol ─────────────────────────
  // Devuelve string[] con los vendedorId permitidos, o null si acceso total (super_admin).
  // Array vacío = sin acceso a nada (cliente sin cartera, no auth).
  private async resolveScopedVendedorIds(payload: TcpPayload): Promise<string[] | null> {
    if (!payload.user?.role) {
      return []; // Sin auth → sin acceso
    }

    if (payload.user.role === UserRole.SUPER_ADMIN) {
      return null; // null = sin filtro (todo)
    }

    if (payload.user.role === UserRole.VENDEDOR) {
      const authUserId = this.payloadAdapter.userId(payload);
      const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
      return [vendedorId];
    }

    if (payload.user.role === UserRole.CLIENTE) {
      const authUserId = this.payloadAdapter.userId(payload);
      return this.clienteVendedorResolver.resolveVendedoresByClienteUserId(authUserId);
    }

    return []; // rol desconocido
  }

  // ─── GET /v1/products/list ──────────────────────────────────────
  @MessagePattern('products.list')
  async list(@Payload() payload: TcpPayload) {
    const filters = await this.payloadAdapter.query(payload, ListProductsDto);
    const vendedorIds = await this.resolveScopedVendedorIds(payload);

    // Sin acceso a nada → devolver vacío
    if (vendedorIds !== null && vendedorIds.length === 0) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    // Scoping activo: validar o resolver vendedorId
    if (vendedorIds !== null) {
      if (filters.vendedorId) {
        // Validar que el vendedorId solicitado esté en sus carteras permitidas
        if (!vendedorIds.includes(filters.vendedorId)) {
          throw new NotFoundException('Producto no encontrado');
        }
      } else if (payload.user?.role === UserRole.CLIENTE && vendedorIds.length > 1) {
        // CLIENTE con multi-cartera debe seleccionar un proveedor explícitamente
        throw new BadRequestException('requiresSelection');
      } else {
        // Un solo vendedor disponible → usarlo automáticamente
        filters.vendedorId = vendedorIds[0];
      }
    }

    return this.productsService.list(filters);
  }

  // ─── GET /v1/products/get?id=xxx ───────────────────────────────
  @MessagePattern('products.get')
  async get(@Payload() payload: TcpPayload) {
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const vendedorIds = await this.resolveScopedVendedorIds(payload);

    const producto = await this.productsService.findById(id);

    // Si hay scope y el producto no está en los vendedores permitidos → 404
    if (vendedorIds !== null && !vendedorIds.includes(producto.vendedorId)) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  // ─── GET /v1/products/search ───────────────────────────────────
  @MessagePattern('products.search')
  async search(@Payload() payload: TcpPayload) {
    const query = await this.payloadAdapter.query(payload, SearchProductDto);
    const vendedorIds = await this.resolveScopedVendedorIds(payload);

    // Sin acceso a nada → devolver vacío
    if (vendedorIds !== null && vendedorIds.length === 0) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    // Scoping activo: validar o resolver vendedorId
    if (vendedorIds !== null) {
      if (query.vendedorId) {
        // Validar que el vendedorId solicitado esté en sus carteras permitidas
        if (!vendedorIds.includes(query.vendedorId)) {
          throw new NotFoundException('Producto no encontrado');
        }
      } else if (payload.user?.role === UserRole.CLIENTE && vendedorIds.length > 1) {
        // CLIENTE con multi-cartera debe seleccionar un proveedor explícitamente
        throw new BadRequestException('requiresSelection');
      } else {
        // Un solo vendedor disponible → usarlo automáticamente
        query.vendedorId = vendedorIds[0];
      }
    }

    return this.productsService.search(query);
  }

  // POST /v1/products/create — auth: VENDEDOR
  // vendedorId NUNCA viene del body: se resuelve del JWT vía usuario-service.
  @MessagePattern('products.create')
  async create(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const dto = await this.payloadAdapter.body(payload, CreateProductDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.productsService.create(vendedorId, dto);
  }

  // PATCH /v1/products/update?id=xxx — auth: VENDEDOR
  @MessagePattern('products.update')
  async update(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const dto = await this.payloadAdapter.body(payload, UpdateProductDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.productsService.update(vendedorId, id, dto);
  }

  // DELETE /v1/products/delete?id=xxx — auth: VENDEDOR
  @MessagePattern('products.delete')
  async remove(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.productsService.remove(vendedorId, id);
  }
}
