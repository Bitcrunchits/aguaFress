import {Logger }from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions} from '@nestjs/microservices';
import { AppModule } from './app.module';
import { validateEnv } from './common/config/env.config';

export function getTcpPort() : number {
return parseInt(process.env.TCP_PORT ?? '',10) || 3015;
}
async function bootstrap() {
    const logger = new Logger ('Bootstrap');
    validateEnv();

    const app = await NestFactory.createMicroservice<MicroserviceOptions> (
        AppModule,
    {
        transport: Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: getTcpPort()
        },
        },
);
await app.listen();
    logger.log(`Entregas Service corriendo en el puerto ${getTcpPort()}`);
}

if (require.main === module) {
    void bootstrap();
}