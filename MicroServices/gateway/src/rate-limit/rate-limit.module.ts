import { Module, type ExecutionContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ACTION_REGISTRY } from '../actions/action-registry';
import { type GatewayEnv } from '../config/env.config';
import { GatewayRateLimitGuard } from './gateway-rate-limit.guard';

const RATE_LIMIT_BUCKET = {
  AUTH_SENSITIVE: 'auth-sensitive',
  AUTHENTICATED_API: 'authenticated-api',
  PUBLIC_API: 'public-api',
} as const;

type RateLimitBucket = (typeof RATE_LIMIT_BUCKET)[keyof typeof RATE_LIMIT_BUCKET];

const SENSITIVE_PUBLIC_ACTIONS = new Set<string>([
  'auth/login',
  'auth/register',
  'auth/register/vendedor',
  'auth/refresh',
]);

interface RateLimitRequestParams {
  readonly service?: string;
  readonly action?: string;
}

interface RateLimitRequest {
  readonly path?: string;
  readonly originalUrl?: string;
  readonly params?: RateLimitRequestParams;
}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<GatewayEnv, true>) => ({
        throttlers: [
          {
            name: RATE_LIMIT_BUCKET.AUTH_SENSITIVE,
            ttl: config.get('RATE_LIMIT_AUTH_SENSITIVE_TTL_MS', { infer: true }),
            limit: config.get('RATE_LIMIT_AUTH_SENSITIVE_MAX', { infer: true }),
            skipIf: (context) => shouldSkipBucket(context, RATE_LIMIT_BUCKET.AUTH_SENSITIVE),
          },
          {
            name: RATE_LIMIT_BUCKET.AUTHENTICATED_API,
            ttl: config.get('RATE_LIMIT_TTL_MS', { infer: true }),
            limit: config.get('RATE_LIMIT_MAX', { infer: true }),
            skipIf: (context) => shouldSkipBucket(context, RATE_LIMIT_BUCKET.AUTHENTICATED_API),
          },
          {
            name: RATE_LIMIT_BUCKET.PUBLIC_API,
            ttl: config.get('RATE_LIMIT_PUBLIC_TTL_MS', { infer: true }),
            limit: config.get('RATE_LIMIT_PUBLIC_MAX', { infer: true }),
            skipIf: (context) => shouldSkipBucket(context, RATE_LIMIT_BUCKET.PUBLIC_API),
          },
        ],
      }),
    }),
  ],
  providers: [GatewayRateLimitGuard],
  exports: [GatewayRateLimitGuard],
})
export class RateLimitModule {}

function shouldSkipBucket(context: ExecutionContext, bucket: RateLimitBucket): boolean {
  const request = context.switchToHttp().getRequest<RateLimitRequest>();
  const routeBucket = resolveRateLimitBucket(request);

  return routeBucket === null || routeBucket !== bucket;
}

function resolveRateLimitBucket(request: RateLimitRequest): RateLimitBucket | null {
  if (isInfrastructureRoute(request)) {
    return null;
  }

  const service = request.params?.service;
  const action = request.params?.action;

  if (service === undefined || action === undefined) {
    return RATE_LIMIT_BUCKET.PUBLIC_API;
  }

  if (SENSITIVE_PUBLIC_ACTIONS.has(`${service}/${action}`)) {
    return RATE_LIMIT_BUCKET.AUTH_SENSITIVE;
  }

  const serviceFamily = ACTION_REGISTRY[service];
  const actionMapping = serviceFamily?.status === 'available' ? serviceFamily.actions[action] : undefined;

  if (actionMapping?.authRequired) {
    return RATE_LIMIT_BUCKET.AUTHENTICATED_API;
  }

  return RATE_LIMIT_BUCKET.PUBLIC_API;
}

function isInfrastructureRoute(request: RateLimitRequest): boolean {
  const routePath = request.path ?? request.originalUrl ?? '';

  return routePath === '/api/health' || routePath.startsWith('/api/docs');
}
