import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { ListProductsDto, IdQueryDto } from '../products/dto/list-products.dto';
import { SearchProductDto } from '../products/dto/search-product.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import {
  VENDEDOR_PROFILE_RESOLVER_PORT,
  type VendedorProfileResolverPort,
} from '../common/usuario-client/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

/**
 * NOTA sobre auth: no tuvimos acceso al guard/decorator @Public() ni al
 * guard global de usuario-service, así que este controller NO asume un
 * guard global de JWT en el contexto TCP — cada handler valida explícitamente
 * con TcpPayloadAdapter (requireUser / requireRole) según lo que pida
 * products-service.json. Confirmar con el equipo si products-service también
 * necesita un guard global equivalente.
 *
 * NOTA sobre routing: el gateway usa rutas de "acción" (:action(.*) comodín +
 * match exacto contra ACTION_REGISTRY), NO rutas REST con :id dinámico.
 * `params` que arma el gateway siempre es { service, action } — nunca trae
 * el id del recurso. Por eso get/update/delete leen `id` desde `query`,
 * ej. GET /v1/products/get?id=xxx — no /v1/products/xxx.
 *
 * NOTA sobre vendedorId: modelo-datos.md v1.4 confirma que `vendedor_id`
 * debe ser `VENDEDOR.id`, no `AUTH_USER.id` (el `sub` del JWT). Se resuelve
 * vía VendedorProfileResolverPort (mismo patrón puerto/adaptador que usa
 * orders-service), cuyo adaptador TCP concreto llama al pattern confirmado
 * 'vendedores.resolve_profile_id' de usuario-domain-tcp.controller.ts.
 */
@Controller()
export class ProductsTcpController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly payloadAdapter: TcpPayloadAdapter,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
    private readonly vendedorResolver: VendedorProfileResolverPort,
  ) {}

  // GET /v1/products/list — auth: VENDEDOR|Público.
  // Si viene user autenticado con rol VENDEDOR y no se pasó vendedorId
  // explícito, se resuelve el vendedorId real. Si es público (o cliente sin
  // vendedorId), se usa el vendedorId del query tal cual (o queda sin filtrar).
  @MessagePattern('products.list')
  async list(@Payload() payload: TcpPayload) {
    const filters = await this.payloadAdapter.query(payload, ListProductsDto);

    if (!filters.vendedorId && payload.user?.role === UserRole.VENDEDOR) {
      const authUserId = this.payloadAdapter.userId(payload);
      filters.vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    }

    return this.productsService.list(filters);
  }

  // GET /v1/products/get?id=xxx — auth: Público
  @MessagePattern('products.get')
  async get(@Payload() payload: TcpPayload) {
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    return this.productsService.findById(id);
  }

  // GET /v1/products/search — auth: Público
  @MessagePattern('products.search')
  async search(@Payload() payload: TcpPayload) {
    const query = await this.payloadAdapter.query(payload, SearchProductDto);
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
