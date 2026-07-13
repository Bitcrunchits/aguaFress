import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Endpoint HTTP mínimo para healthcheck (docker-compose `healthcheck`, load balancers, etc).
 * El resto de la lógica de negocio de products-service se expone por TCP (ver src/tcp),
 * consumida por el gateway — no directamente por HTTP.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'products-service' };
  }
}
