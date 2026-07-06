import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createGatewayEnv } from './config/env.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('GatewayBootstrap');
  const gatewayEnv = createGatewayEnv(process.env);
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(json({ limit: gatewayEnv.payloadLimit }));
  app.use(urlencoded({ extended: true, limit: gatewayEnv.payloadLimit }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(gatewayEnv.port);
  logger.log(`api-gateway running on port ${gatewayEnv.port}`);
}

void bootstrap();
