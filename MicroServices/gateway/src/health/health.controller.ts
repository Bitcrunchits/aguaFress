import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';

export interface HealthResponse {
  readonly status: string;
  readonly service: string;
  readonly version: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Public endpoint to verify the gateway is running.' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
    };
  }
}
