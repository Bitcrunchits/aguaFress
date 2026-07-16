import {
  Body,
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
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { ActionResolverService } from './actions/action-resolver.service';
import { TcpDispatcherService, type TcpCommandPayload } from './tcp/tcp-dispatcher.service';

@ApiExcludeController()
@ApiTags('Gateway Actions')
@ApiBearerAuth()
@Controller('v1/:service')
export class GatewayController {
  constructor(
    private readonly resolver: ActionResolverService,
    private readonly dispatcher: TcpDispatcherService,
  ) {}

  @Head(':action(.*)')
  @ApiOperation({ summary: 'Reject HEAD', description: 'HEAD is not supported by the gateway action router.' })
  @ApiResponse({ status: 405, description: 'Method not allowed' })
  rejectHeadMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  @Get(':action(.*)')
  @ApiOperation({ summary: 'Execute a GET action', description: 'Dispatches a read-only action to the target microservice via TCP.' })
  @ApiParam({ name: 'service', description: 'Service family (auth, users, vendedores, clientes, etc.)' })
  @ApiParam({ name: 'action', description: 'Action to execute within the service family' })
  @ApiQuery({ name: 'query', required: false, description: 'Query parameters forwarded to the microservice' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Action or service not found' })
  @ApiResponse({ status: 503, description: 'Service family not deployed' })
  @ApiResponse({ status: 504, description: 'Microservice did not respond in time' })
  async handleGetAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action });
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Post(':action(.*)')
  @HttpCode(200)
  @ApiOperation({ summary: 'Execute a POST action', description: 'Dispatches a mutating action to the target microservice via TCP.' })
  @ApiParam({ name: 'service', description: 'Service family' })
  @ApiParam({ name: 'action', description: 'Action to execute' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Action or service not found' })
  @ApiResponse({ status: 504, description: 'Microservice did not respond in time' })
  async handlePostAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Body() body: unknown,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action }, sanitizeBodyIdentity(body));
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Patch(':action(.*)')
  @ApiOperation({ summary: 'Execute a PATCH action', description: 'Dispatches a partial update action to the target microservice via TCP.' })
  @ApiParam({ name: 'service', description: 'Service family' })
  @ApiParam({ name: 'action', description: 'Action to execute' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Action or service not found' })
  @ApiResponse({ status: 504, description: 'Microservice did not respond in time' })
  async handlePatchAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Body() body: unknown,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action }, sanitizeBodyIdentity(body));
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Delete(':action(.*)')
  @ApiOperation({ summary: 'Execute a DELETE action', description: 'Dispatches a delete action to the target microservice via TCP.' })
  @ApiParam({ name: 'service', description: 'Service family' })
  @ApiParam({ name: 'action', description: 'Action to execute' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Action or service not found' })
  @ApiResponse({ status: 504, description: 'Microservice did not respond in time' })
  async handleDeleteAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Body() body: unknown,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action }, sanitizeBodyIdentity(body));
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Put(':action(.*)')
  @ApiOperation({ summary: 'Reject PUT', description: 'PUT is not supported by the gateway action router.' })
  @ApiResponse({ status: 405, description: 'Method not allowed' })
  rejectPutMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  @Options(':action(.*)')
  @ApiOperation({ summary: 'Reject OPTIONS', description: 'OPTIONS is not supported by the gateway action router.' })
  @ApiResponse({ status: 405, description: 'Method not allowed' })
  rejectOptionsMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  private buildPayload(
    req: Request,
    query: Record<string, string>,
    params: Record<string, string>,
    body?: unknown,
  ): TcpCommandPayload {
    const user = (req as unknown as Record<string, unknown>).user as
      | { sub: string; email: string; role: string }
      | undefined;

    return {
      body,
      query,
      params,
      user,
      requestId: (req.headers['x-request-id'] as string) ?? randomUUID(),
    };
  }

  private rejectUnsupportedMethod(): never {
    throw new MethodNotAllowedException('Gateway actions support GET, POST, PATCH, and DELETE only');
  }
}

function sanitizeBodyIdentity(body: unknown): unknown {
  if (!isPlainRecord(body)) {
    return body;
  }

  const bodyWithoutUserId = { ...body };
  delete bodyWithoutUserId.userId;
  return bodyWithoutUserId;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
