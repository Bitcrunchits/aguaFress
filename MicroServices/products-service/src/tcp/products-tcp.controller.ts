import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { ListProductsDto, IdQueryDto } from '../products/dto/list-products.dto';
import { SearchProductDto } from '../products/dto/search-product.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
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
 */
@Controller()
export class ProductsTcpController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  // GET /v1/products/list — auth: VENDEDOR|Público.
  // Si viene user autenticado y no se pasó vendedorId explícito, se filtra
  // por el vendedor autenticado. Si es público, se usa el vendedorId del query.
  @MessagePattern('products.list')
  async list(@Payload() payload: TcpPayload) {
    const filters = await this.payloadAdapter.query(payload, ListProductsDto);

    if (!filters.vendedorId && payload.user) {
      const user = this.payloadAdapter.requireUser(payload);
      filters.vendedorId = user.sub ?? user.userId;
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
  // vendedorId NUNCA viene del body: se extrae del JWT (regla de seguridad).
  @MessagePattern('products.create')
  async create(@Payload() payload: TcpPayload) {
    const user = this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const dto = await this.payloadAdapter.body(payload, CreateProductDto);
    const vendedorId = user.sub ?? user.userId!;
    return this.productsService.create(vendedorId, dto);
  }

  // PATCH /v1/products/update?id=xxx — auth: VENDEDOR
  @MessagePattern('products.update')
  async update(@Payload() payload: TcpPayload) {
    const user = this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const dto = await this.payloadAdapter.body(payload, UpdateProductDto);
    const vendedorId = user.sub ?? user.userId!;
    return this.productsService.update(vendedorId, id, dto);
  }

  // DELETE /v1/products/delete?id=xxx — auth: VENDEDOR
  @MessagePattern('products.delete')
  async remove(@Payload() payload: TcpPayload) {
    const user = this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const vendedorId = user.sub ?? user.userId!;
    return this.productsService.remove(vendedorId, id);
  }
}
