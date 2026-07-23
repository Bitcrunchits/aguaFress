import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CategoriesService } from '../categories/categories.service';
import { ListCatalogoDto } from '../categories/dto/list-catalogo.dto';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class CategoriesTcpController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  // GET /v1/categories/list?vendedorId=xxx — auth: Público
  @MessagePattern('categories.list')
  async listCategorias(@Payload() payload: TcpPayload) {
    const { vendedorId } = await this.payloadAdapter.query(payload, ListCatalogoDto);
    return this.categoriesService.listCategorias(vendedorId);
  }

  // GET /v1/brands/list?vendedorId=xxx — auth: Público
  @MessagePattern('brands.list')
  async listMarcas(@Payload() payload: TcpPayload) {
    const { vendedorId } = await this.payloadAdapter.query(payload, ListCatalogoDto);
    return this.categoriesService.listMarcas(vendedorId);
  }
}
