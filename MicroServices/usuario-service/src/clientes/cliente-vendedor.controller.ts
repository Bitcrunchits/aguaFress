import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteVendedorDto } from './dto/update-cliente-vendedor.dto';
import { VendedorGuard } from '../vendedores/guards/vendedor.guard';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('clientes/mios')
@UseGuards(VendedorGuard)
@ApiTags('Clientes (Vendedor)')
@ApiBearerAuth()
export class ClienteVendedorController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly resolver: VendedorResolver,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my clientes', description: "List the authenticated vendedor's own clientes with pagination" })
  @ApiResponse({ status: 200, description: 'Clientes list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listOwn(
    @CurrentUser('userId') userId: string,
    @Query() filters: ListClientesDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.clientesService.listOwn(vendedorId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my cliente by ID', description: "Returns one of the vendedor's own clientes by ID" })
  @ApiResponse({ status: 200, description: 'Cliente found' })
  @ApiResponse({ status: 404, description: 'Cliente not found' })
  async getOwnById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.clientesService.getOwnById(id, vendedorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update my cliente', description: "Updates one of the vendedor's own clientes" })
  @ApiBody({ type: UpdateClienteVendedorDto })
  @ApiResponse({ status: 200, description: 'Cliente updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateOwn(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateClienteVendedorDto,
  ) {
    const vendedorId = await this.resolver.resolve(userId);
    return this.clientesService.updateOwn(id, vendedorId, dto);
  }
}
