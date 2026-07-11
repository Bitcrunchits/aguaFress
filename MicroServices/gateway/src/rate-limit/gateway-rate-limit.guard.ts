import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

interface GatewayRateLimitUser {
  readonly sub?: string;
  readonly id?: string;
  readonly userId?: string;
}

interface GatewayRateLimitParams {
  readonly service?: string;
  readonly action?: string;
}

interface GatewayRateLimitRequest {
  readonly ip?: string;
  readonly path?: string;
  readonly originalUrl?: string;
  readonly params?: GatewayRateLimitParams;
  readonly user?: GatewayRateLimitUser;
  readonly socket?: {
    readonly remoteAddress?: string;
  };
}

@Injectable()
export class GatewayRateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as GatewayRateLimitRequest;
    const userId = request.user?.sub ?? request.user?.id ?? request.user?.userId;

    if (userId !== undefined && userId.trim().length > 0) {
      return `user:${userId}`;
    }

    return `ip:${this.getClientIp(request)}`;
  }

  protected generateKey(context: ExecutionContext, tracker: string, throttlerName: string): string {
    const request = context.switchToHttp().getRequest<GatewayRateLimitRequest>();
    const service = request.params?.service ?? 'infra';
    const action = request.params?.action ?? this.getInfraAction(request);

    return createHash('sha256')
      .update(`${throttlerName}:${service}:${action}:${tracker}`)
      .digest('hex');
  }

  private getClientIp(request: GatewayRateLimitRequest): string {
    // Do not trust x-forwarded-for here. If the gateway is reachable directly,
    // clients can spoof that header and bypass IP-based limits. Express `req.ip`
    // is the safe source unless `trust proxy` is explicitly configured later.
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private getInfraAction(request: GatewayRateLimitRequest): string {
    return request.path ?? request.originalUrl ?? 'unknown';
  }
}
