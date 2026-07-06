import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  app.use(json({ limit: gatewayEnv.PAYLOAD_LIMIT }));
  app.use(urlencoded({ extended: true, limit: gatewayEnv.PAYLOAD_LIMIT }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AguaFress API Gateway')
    .setDescription('Punto de entrada HTTP único. Traduce requests /api/v1/{service}/{action} a mensajes TCP a los microservicios.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(gatewayEnv.PORT);
  logger.log(`api-gateway running on port ${gatewayEnv.PORT}`);
}

void bootstrap();
