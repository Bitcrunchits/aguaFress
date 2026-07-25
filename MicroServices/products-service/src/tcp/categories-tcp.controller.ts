import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { CategoriesService } from '../categories/categories.service';
import { ListCatalogoDto } from '../categories/dto/list-catalogo.dto';
import { CreateCategoriaDto } from '../categories/dto/create-categoria.dto';
import { UpdateCategoriaDto } from '../categories/dto/update-categoria.dto';
import { CreateMarcaDto } from '../categories/dto/create-marca.dto';
import { UpdateMarcaDto } from '../categories/dto/update-marca.dto';
import { IdQueryDto } from '../products/dto/list-products.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import {
  VENDEDOR_PROFILE_RESOLVER_PORT,
  type VendedorProfileResolverPort,
} from '../common/usuario-client/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class CategoriesTcpController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly payloadAdapter: TcpPayloadAdapter,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
    private readonly vendedorResolver: VendedorProfileResolverPort,
  ) {}

  // GET /v1/categories/list?vendedorId=xxx — auth: Público
  @MessagePattern('categories.list')
  async listCategorias(@Payload() payload: TcpPayload) {
    const { vendedorId } = await this.payloadAdapter.query(payload, ListCatalogoDto);
    return this.categoriesService.listCategorias(vendedorId);
  }

  // POST /v1/categories/create — auth: VENDEDOR
  @MessagePattern('categories.create')
  async createCategoria(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const dto = await this.payloadAdapter.body(payload, CreateCategoriaDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.categoriesService.createCategoria(vendedorId, dto);
  }

  // PATCH /v1/categories/update?id=xxx — auth: VENDEDOR
  @MessagePattern('categories.update')
  async updateCategoria(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const dto = await this.payloadAdapter.body(payload, UpdateCategoriaDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.categoriesService.updateCategoria(vendedorId, id, dto);
  }

  // DELETE /v1/categories/delete?id=xxx — auth: VENDEDOR
  @MessagePattern('categories.delete')
  async deleteCategoria(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.categoriesService.deleteCategoria(vendedorId, id);
  }

  // GET /v1/brands/list?vendedorId=xxx — auth: Público
  @MessagePattern('brands.list')
  async listMarcas(@Payload() payload: TcpPayload) {
    const { vendedorId } = await this.payloadAdapter.query(payload, ListCatalogoDto);
    return this.categoriesService.listMarcas(vendedorId);
  }

  // POST /v1/brands/create — auth: VENDEDOR
  @MessagePattern('brands.create')
  async createMarca(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const dto = await this.payloadAdapter.body(payload, CreateMarcaDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.categoriesService.createMarca(vendedorId, dto);
  }

  // PATCH /v1/brands/update?id=xxx — auth: VENDEDOR
  @MessagePattern('brands.update')
  async updateMarca(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const dto = await this.payloadAdapter.body(payload, UpdateMarcaDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.categoriesService.updateMarca(vendedorId, id, dto);
  }

  // DELETE /v1/brands/delete?id=xxx — auth: VENDEDOR
  @MessagePattern('brands.delete')
  async deleteMarca(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    const { id } = await this.payloadAdapter.query(payload, IdQueryDto);
    const authUserId = this.payloadAdapter.userId(payload);
    const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
    return this.categoriesService.deleteMarca(vendedorId, id);
  }
}
