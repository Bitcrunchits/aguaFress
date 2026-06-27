import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteVendedorDto } from './dto/update-cliente-vendedor.dto';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('clientes/mios')
@UseGuards(VendedorGuard)
export class ClienteVendedorController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  async listMios(
    @CurrentUser('userId') userId: string,
    @Query() filters: ListClientesDto,
  ) {
    return this.clientesService.listMios(userId, filters);
  }

  @Get(':id')
  async getByIdMio(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.clientesService.getByIdMio(id, userId);
  }

  @Patch(':id')
  async updateMio(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateClienteVendedorDto,
  ) {
    return this.clientesService.updateMio(id, userId, dto);
  }
}
