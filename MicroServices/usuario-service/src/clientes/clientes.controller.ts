import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ReasignarVendedorDto } from './dto/reasignar-vendedor.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clientes')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  async list(@Query() filters: ListClientesDto) {
    return this.clientesService.list(filters);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.clientesService.getById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, dto);
  }

  @Patch(':id/reassign')
  async reassign(
    @Param('id') id: string,
    @Body() dto: ReasignarVendedorDto,
  ) {
    return this.clientesService.reassign(id, dto);
  }
}
