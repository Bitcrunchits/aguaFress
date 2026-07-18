import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
async function bootstrap() {
const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );
const config = new DocumentBuilder()
    .setTitle('Entregas Service')
    .setDescription('API para gestión de entregas - AguaFress')
    .setVersion('1.0')
    .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
const PORT = process.env.PORT || 3005;
await app.listen(PORT, () => {
    logger.log(`Entregas Service corriendo en el puerto ${PORT}`);
});
}
bootstrap();