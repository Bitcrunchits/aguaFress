import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

/**
 * Re-exports the Multer configuration for the upload routes. The
 * `UploadProxyController` lives in `AppModule` (registered BEFORE the generic
 * `GatewayController` so the static `/v1/upload/*` routes win over the
 * catch-all action router), so this module only carries the shared multer
 * config and re-exports it for the controller's injector scope.
 */
@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  ],
  exports: [MulterModule],
})
export class UploadProxyModule {}
