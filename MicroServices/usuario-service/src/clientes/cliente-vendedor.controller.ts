import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteVendedorDto } from './dto/update-cliente-vendedor.dto';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('clientes/mios')
@UseGuards(VendedorGuard)
export class ClienteVendedorController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly resolver: VendedorResolver,
  ) {}

  @Get()
  async listOwn(
    @CurrentUser('userId') userId: string,
    @Query() filters: ListClientesDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.clientesService.listOwn(vendedorId, filters);
  }

  @Get(':id')
  async getOwnById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.clientesService.getOwnById(id, vendedorId);
  }

  @Patch(':id')
  async updateOwn(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateClienteVendedorDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.clientesService.updateOwn(id, vendedorId, dto);
  }
}
