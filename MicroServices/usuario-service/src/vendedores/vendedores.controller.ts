import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
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
@ApiTags('Vendedores (Admin)')
@ApiBearerAuth()
export class VendedoresController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @Get()
  @ApiOperation({ summary: 'List vendedores', description: 'List all vendedores with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Vendedores list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async list(@Query() filters: ListVendedoresDto) {
    return this.vendedoresService.list(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendedor by ID', description: 'Returns a single vendedor by their ID' })
  @ApiResponse({ status: 200, description: 'Vendedor found' })
  @ApiResponse({ status: 404, description: 'Vendedor not found' })
  async getById(@Param('id') id: string) {
    return this.vendedoresService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vendedor', description: "Updates a vendedor's details" })
  @ApiBody({ type: UpdateVendedorDto })
  @ApiResponse({ status: 200, description: 'Vendedor updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Vendedor not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVendedorDto,
  ) {
    return this.vendedoresService.update(id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Change vendedor estado', description: "Changes a vendedor's status (activate/deactivate/suspend)" })
  @ApiBody({ type: ChangeEstadoDto })
  @ApiResponse({ status: 200, description: 'Estado changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid estado transition' })
  async changeEstado(
    @Param('id') id: string,
    @Body() dto: ChangeEstadoDto,
  ) {
    return this.vendedoresService.changeEstado(id, dto);
  }
}
