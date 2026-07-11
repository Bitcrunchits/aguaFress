import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
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
@ApiTags('Clientes (Admin)')
@ApiBearerAuth()
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'List clientes', description: 'List all clientes with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Clientes list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async list(@Query() filters: ListClientesDto) {
    return this.clientesService.list(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cliente by ID', description: 'Returns a single cliente by their ID' })
  @ApiResponse({ status: 200, description: 'Cliente found' })
  @ApiResponse({ status: 404, description: 'Cliente not found' })
  async getById(@Param('id') id: string) {
    return this.clientesService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cliente', description: "Updates a cliente's details" })
  @ApiBody({ type: UpdateClienteDto })
  @ApiResponse({ status: 200, description: 'Cliente updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, dto);
  }

  @Patch(':id/reassign')
  @ApiOperation({ summary: 'Reassign vendedor', description: 'Reassigns a cliente to a different vendedor' })
  @ApiBody({ type: ReasignarVendedorDto })
  @ApiResponse({ status: 200, description: 'Vendedor reassigned successfully' })
  @ApiResponse({ status: 404, description: 'Cliente or vendedor not found' })
  async reassign(
    @Param('id') id: string,
    @Body() dto: ReasignarVendedorDto,
  ) {
    return this.clientesService.reassign(id, dto);
  }
}
