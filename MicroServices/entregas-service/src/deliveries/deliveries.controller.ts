import {Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { DeliveryResponseDto } from './dto/delivery-response.dto';
import { UpdateDeliveryStatusResponseDto } from './dto/update-delivery-status-response.dto';

@ApiTags('Deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}
    @Get()
    @ApiOperation({ summary: 'Obtiene todas las entregas del día del vendedor paginadas' })
    @ApiOkResponse({ type: DeliveryResponseDto, isArray: true, description: 'Lista de entregas del día' })
  findAll(@Query() query: QueryDeliveriesDto) {
    return this.deliveriesService.findAll(query);
  } 
  @Get('/:id')
  @ApiOperation({ summary: 'Obtiene una entrega por su ID' })
  @ApiOkResponse({ type: DeliveryResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveriesService.findOne(id);
  }
  @Patch('/:id/status')
  @ApiOperation({ summary: 'Actualiza el estado de una entrega' })
  @ApiOkResponse({ type: UpdateDeliveryStatusResponseDto })
  updateStatus(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateDeliveryStatusDto) {
    return this.deliveriesService.updateStatus(id, dto);
  }
}
