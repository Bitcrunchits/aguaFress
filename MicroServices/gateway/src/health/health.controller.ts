import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  readonly status: string;
  readonly service: string;
  readonly version: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
    };
  }
}
