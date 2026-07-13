import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { validateEnv } from './common/config/env.config';

export function getTcpPort(): number {
  return parseInt(process.env.TCP_PORT ?? '', 10) || 3013;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  validateEnv();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AguaFress — products-service')
    .setDescription('Catálogo de productos, categorías, marcas, stock, búsquedas')
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

  const port = parseInt(process.env.PORT ?? '', 10) || 3003;
  const tcpPort = getTcpPort();

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: tcpPort,
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
  await app.listen(port);
  logger.log(`products-service HTTP running on port ${port}`);
  logger.log(`products-service TCP running on port ${tcpPort}`);
}

if (require.main === module) {
  void bootstrap();
}
