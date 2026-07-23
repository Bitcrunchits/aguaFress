import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { validateEnv } from './common/config/env.config';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';

export function getTcpPort(): number {
  return parseInt(process.env.TCP_PORT ?? '', 10) || 3013;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  validateEnv();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: getTcpPort(),
      },
    },
  );

  app.useGlobalFilters(new RpcExceptionFilter());

  await app.listen();
  logger.log(`products-service TCP running on port ${getTcpPort()}`);
}

if (require.main === module) {
  void bootstrap();
}
