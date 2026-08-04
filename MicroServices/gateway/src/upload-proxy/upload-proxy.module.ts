import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadProxyController } from './upload-proxy.controller';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  ],
  controllers: [UploadProxyController],
})
export class UploadProxyModule {}
