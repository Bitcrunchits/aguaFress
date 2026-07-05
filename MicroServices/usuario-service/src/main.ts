import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { validateEnv } from './common/config/env.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  validateEnv();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AguaFress — usuario-service')
    .setDescription('Auth, usuarios, vendedores, clientes, super-admins')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new RpcExceptionFilter(httpAdapterHost));

  const port = parseInt(process.env.PORT ?? '', 10) || 3001;
  await app.listen(port);
  logger.log(`usuario-service running on port ${port}`);
}

bootstrap();
