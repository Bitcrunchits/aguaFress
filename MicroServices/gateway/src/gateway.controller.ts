import {
  Controller,
  Delete,
  Get,
  Head,
  HttpCode,
  MethodNotAllowedException,
  Options,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

export const GATEWAY_ROUTE_STATUS = {
  ROUTING_NOT_IMPLEMENTED: 'routing-not-implemented',
} as const;

export type GatewayRouteStatus =
  (typeof GATEWAY_ROUTE_STATUS)[keyof typeof GATEWAY_ROUTE_STATUS];

export interface GatewayRouteResponse {
  readonly service: string;
  readonly action: string;
  readonly status: GatewayRouteStatus;
}

@Controller('v1/:service/:action')
export class GatewayController {
  @Head()
  rejectHeadMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  @Get()
  handleGetAction(@Param('service') service: string, @Param('action') action: string): GatewayRouteResponse {
    return this.createFoundationResponse(service, action);
  }

  @Post()
  @HttpCode(200)
  handlePostAction(@Param('service') service: string, @Param('action') action: string): GatewayRouteResponse {
    return this.createFoundationResponse(service, action);
  }

  @Patch()
  handlePatchAction(@Param('service') service: string, @Param('action') action: string): GatewayRouteResponse {
    return this.createFoundationResponse(service, action);
  }

  @Delete()
  handleDeleteAction(@Param('service') service: string, @Param('action') action: string): GatewayRouteResponse {
    return this.createFoundationResponse(service, action);
  }

  @Put()
  rejectPutMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  @Options()
  rejectOptionsMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  handleAction(service: string, action: string): GatewayRouteResponse {
    return this.createFoundationResponse(service, action);
  }

  private createFoundationResponse(service: string, action: string): GatewayRouteResponse {
    return {
      service,
      action,
      status: GATEWAY_ROUTE_STATUS.ROUTING_NOT_IMPLEMENTED,
    };
  }

  private rejectUnsupportedMethod(): never {
    throw new MethodNotAllowedException('Gateway actions support GET, POST, PATCH, and DELETE only');
  }
}
