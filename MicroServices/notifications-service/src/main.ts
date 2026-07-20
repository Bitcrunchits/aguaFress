import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { getTcpPort } from './common/config/env.config';

export async function bootstrap(): Promise<void> {
  const port = getTcpPort();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port,
    },
  });

  await app.listen();
  logger.log(`notifications-service TCP running on port ${port}`);
}

if (require.main === module) {
  void bootstrap();
}
