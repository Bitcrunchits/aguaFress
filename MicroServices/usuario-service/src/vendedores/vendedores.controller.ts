import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { VendedoresService } from './vendedores.service';
import { ListVendedoresDto } from './dto/list-vendedores.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';
import { ChangeEstadoDto } from './dto/change-estado.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vendedores')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class VendedoresController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @Get()
  async list(@Query() filters: ListVendedoresDto) {
    return this.vendedoresService.list(filters);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.vendedoresService.getById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVendedorDto,
  ) {
    return this.vendedoresService.update(id, dto);
  }

  @Patch(':id/estado')
  async changeEstado(
    @Param('id') id: string,
    @Body() dto: ChangeEstadoDto,
  ) {
    return this.vendedoresService.changeEstado(id, dto);
  }
}
