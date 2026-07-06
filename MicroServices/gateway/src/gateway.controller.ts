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
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { ActionResolverService } from './actions/action-resolver.service';
import { TcpDispatcherService, type TcpCommandPayload } from './tcp/tcp-dispatcher.service';

@Controller('v1/:service')
export class GatewayController {
  constructor(
    private readonly resolver: ActionResolverService,
    private readonly dispatcher: TcpDispatcherService,
  ) {}

  @Head()
  rejectHeadWithoutAction(): never {
    return this.rejectUnsupportedMethod();
  }

  @Head(':action(*)')
  rejectHeadWithAction(): never {
    return this.rejectUnsupportedMethod();
  }

  @Get(':action(*)')
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

  @Post(':action(*)')
  @HttpCode(200)
  async handlePostAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Body() body: unknown,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action }, body);
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Patch(':action(*)')
  async handlePatchAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Body() body: unknown,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action }, body);
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Delete(':action(*)')
  async handleDeleteAction(
    @Param('service') service: string,
    @Param('action') action: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ): Promise<unknown> {
    const mapping = this.resolver.resolve(service, action);
    const payload = this.buildPayload(req, query, { service, action });
    return this.dispatcher.dispatch(service, payload, mapping);
  }

  @Put(':action(*)')
  rejectPutMethod(): never {
    return this.rejectUnsupportedMethod();
  }

  @Options(':action(*)')
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
