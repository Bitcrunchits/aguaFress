import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { UploadService } from '../common/upload/upload.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class UsuarioUploadTcpController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly payloadAdapter: TcpPayloadAdapter,
  ) {}

  // POST /v1/upload/vendor-logo — auth: VENDEDOR
  @MessagePattern('users.upload_logo')
  async uploadVendorLogo(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);

    const body = payload.body as Record<string, unknown> | undefined;
    const file = body?.file as string | undefined;
    const mimetype = body?.mimetype as string | undefined;

    if (!file || !mimetype) {
      throw new BadRequestException('file (base64) and mimetype are required');
    }

    const imageId = await this.uploadService.saveImage({ base64: file, mimetype }, 'logos');
    return { imageId };
  }
}
