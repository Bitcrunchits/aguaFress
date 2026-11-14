import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  json,
  static as serveStatic,
  urlencoded,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createGatewayEnv } from './config/env.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('GatewayBootstrap');
  const gatewayEnv = createGatewayEnv(process.env);
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://proxy.scalar.com'],
        },
      },
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(json({ limit: gatewayEnv.PAYLOAD_LIMIT }));
  app.use(urlencoded({ extended: true, limit: gatewayEnv.PAYLOAD_LIMIT }));
  // Uploaded images are public and must load cross-origin (e.g. an <img> on
  // the frontend dev server). Helmet defaults CORP to same-origin, which the
  // browser enforces and blocks cross-origin <img> requests to /uploads.
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.use('/uploads', serveStatic(gatewayEnv.UPLOAD_DIR, { fallthrough: false, index: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(gatewayEnv.PORT);
  logger.log(`api-gateway running on port ${gatewayEnv.PORT}`);
  logger.log(`API docs: http://localhost:${gatewayEnv.PORT}/api/docs`);
}

void bootstrap();
