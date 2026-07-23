import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Head,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  Options,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ActionResolverService } from './actions/action-resolver.service';
import { TcpDispatcherService, type TcpCommandPayload } from './tcp/tcp-dispatcher.service';
import { OrdersCreateQueueService } from './queues/orders-create-queue.service';
import { DeliveriesQueueService } from './queues/deliveries-queue.service';
import type { UpdateDeliveryStatusJobData } from '@agua/contracts';

const PROVIDER_SELECTION_MAPPING = {
  tcpPattern: 'clientes.providers_select',
  transport: 'send',
  authRequired: true,
  roles: ['cliente'],
  retryOnTimeout: false,
} as const;

@ApiExcludeController()
@ApiTags('Gateway Actions')
@ApiBearerAuth()
@Controller('v1/:service')
export class GatewayController {
  constructor(
    private readonly resolver: ActionResolverService,
    private readonly dispatcher: TcpDispatcherService,
    private readonly ordersCreateQueue: OrdersCreateQueueService,
    private readonly deliveriesQueue: DeliveriesQueueService,
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
    await this.validateProviderScopedDispatch(service, req, payload);
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
    @Res({ passthrough: true }) res?: Response,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const sanitizedBody = sanitizeBodyIdentity(body);

    if (mapping.asyncQueue === 'orders.create') {
      const vendedorId = readProviderContext(sanitizedBody, query);
      if (vendedorId === undefined) {
        throw new BadRequestException('vendedorId is required for orders.create');
      }
      await this.validateProviderContext(req, vendedorId);
      res?.status(HttpStatus.ACCEPTED);
      return this.ordersCreateQueue.enqueue({
        clienteId: readAuthenticatedClienteId(req),
        vendedorId,
        idempotencyKey: readOrdersCreateIdempotencyKey(req, sanitizedBody),
        body: sanitizeAsyncMetadata(sanitizedBody),
        requestId: readRequestId(req),
      });
    }

    const payload = this.buildPayload(req, query, { service, action }, sanitizedBody);
    await this.validateProviderScopedDispatch(service, req, payload);
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
    @Res({ passthrough: true }) res?: Response,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const sanitizedBody = sanitizeBodyIdentity(body);

    if (mapping.asyncQueue === 'deliveries.update_status') {
      const deliveryId = readDeliveryId(query, sanitizedBody);
      if (deliveryId === undefined) {
        throw new BadRequestException('delivery id is required for deliveries.update-status');
      }

      const user = readAuthenticatedUser(req);
      const idempotencyKey = readDeliveriesIdempotencyKey(req, sanitizedBody);
      const vendedorId = user?.sub ?? '';
      const actorUserId = user?.sub ?? '';
      const requestId = readRequestId(req);
      const parsedBody = isPlainRecord(sanitizedBody) ? sanitizedBody as Record<string, unknown> : {};

      res?.status(HttpStatus.ACCEPTED);
      return this.deliveriesQueue.enqueue({
        deliveryId,
        vendedorId,
        actorUserId,
        estado: parsedBody.estado as UpdateDeliveryStatusJobData['estado'],
        notas: typeof parsedBody.notas === 'string' ? parsedBody.notas : undefined,
        idempotencyKey,
        requestId,
      });
    }

    const payload = this.buildPayload(req, query, { service, action }, sanitizedBody);
    await this.validateProviderScopedDispatch(service, req, payload);
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
    await this.validateProviderScopedDispatch(service, req, payload);
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
      requestId: readRequestId(req),
    };
  }

  private rejectUnsupportedMethod(): never {
    throw new MethodNotAllowedException('Gateway actions support GET, POST, PATCH, and DELETE only');
  }

  private async validateProviderScopedDispatch(
    service: string,
    req: Request,
    payload: TcpCommandPayload,
  ): Promise<void> {
    if (!isProviderScopedService(service)) {
      return;
    }

    const vendedorId = readProviderContext(payload.body, payload.query);
    if (vendedorId === undefined) {
      if (service === 'cart') {
        throw new BadRequestException('vendedorId is required for provider-scoped cart actions');
      }

      return;
    }

    await this.validateProviderContext(req, vendedorId);
  }

  private async validateProviderContext(req: Request, vendedorId: string): Promise<void> {
    await this.dispatcher.dispatch('clientes', {
      body: { vendedorId },
      query: {},
      params: { service: 'clientes', action: 'providers/select' },
      user: readAuthenticatedUser(req),
      requestId: readRequestId(req),
    }, PROVIDER_SELECTION_MAPPING);
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

function sanitizeAsyncMetadata(body: unknown): Record<string, unknown> {
  if (!isPlainRecord(body)) {
    return {};
  }

  const bodyWithoutAsyncMetadata = { ...body };
  delete bodyWithoutAsyncMetadata.idempotencyKey;
  return bodyWithoutAsyncMetadata;
}

function readProviderContext(body: unknown, query?: Record<string, string>): string | undefined {
  const queryVendedorId = query?.vendedorId?.trim();
  if (queryVendedorId !== undefined && queryVendedorId.length > 0) {
    return queryVendedorId;
  }

  if (!isPlainRecord(body) || typeof body.vendedorId !== 'string') {
    return undefined;
  }

  const bodyVendedorId = body.vendedorId.trim();
  return bodyVendedorId.length > 0 ? bodyVendedorId : undefined;
}

function readOrdersCreateIdempotencyKey(req: Request, body: unknown): string {
  const headerKey = readStringHeader(req.headers['idempotency-key']);
  const bodyKey = isPlainRecord(body) && typeof body.idempotencyKey === 'string'
    ? body.idempotencyKey.trim()
    : undefined;

  if (headerKey !== undefined && bodyKey !== undefined && headerKey !== bodyKey) {
    throw new BadRequestException('Idempotency-Key header must match body idempotencyKey');
  }

  const idempotencyKey = headerKey ?? bodyKey;
  if (idempotencyKey === undefined || idempotencyKey.length === 0) {
    throw new BadRequestException('Idempotency key is required for orders.create');
  }

  return idempotencyKey;
}

function readAuthenticatedClienteId(req: Request): string {
  const user = readAuthenticatedUser(req);

  if (typeof user?.sub !== 'string' || user.sub.trim().length === 0) {
    throw new BadRequestException('Authenticated cliente id is required for orders.create');
  }

  return user.sub;
}

function readAuthenticatedUser(req: Request): { sub: string; email: string; role: string } | undefined {
  return (req as unknown as { user?: { sub: string; email: string; role: string } }).user;
}

function readRequestId(req: Request): string {
  return readStringHeader(req.headers['x-request-id']) ?? randomUUID();
}

function readStringHeader(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProviderScopedService(service: string): boolean {
  return service === 'cart' || service === 'orders';
}

function readDeliveryId(query: Record<string, string>, body: unknown): string | undefined {
  const queryId = query.id?.trim();
  if (queryId !== undefined && queryId.length > 0) {
    return queryId;
  }

  if (!isPlainRecord(body) || typeof body.id !== 'string') {
    return undefined;
  }

  const bodyId = body.id.trim();
  return bodyId.length > 0 ? bodyId : undefined;
}

function readDeliveriesIdempotencyKey(req: Request, body: unknown): string {
  const headerKey = readStringHeader(req.headers['idempotency-key']);
  const bodyKey = isPlainRecord(body) && typeof body.idempotencyKey === 'string'
    ? body.idempotencyKey.trim()
    : undefined;

  if (headerKey !== undefined && bodyKey !== undefined && headerKey !== bodyKey) {
    throw new BadRequestException('Idempotency-Key header must match body idempotencyKey');
  }

  const idempotencyKey = headerKey ?? bodyKey;
  if (idempotencyKey === undefined || idempotencyKey.length === 0) {
    throw new BadRequestException('Idempotency key is required for deliveries.update-status');
  }

  return idempotencyKey;
}
