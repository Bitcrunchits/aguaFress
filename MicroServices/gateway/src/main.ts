import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, static as serveStatic, urlencoded } from 'express';
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
