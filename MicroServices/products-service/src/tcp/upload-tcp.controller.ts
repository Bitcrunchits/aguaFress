import { BadRequestException, Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserRole } from '@agua/contracts';
import { UploadService } from '../common/upload/upload.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import {
  VENDEDOR_PROFILE_RESOLVER_PORT,
  type VendedorProfileResolverPort,
} from '../common/usuario-client/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

@Controller()
export class ProductsUploadTcpController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly payloadAdapter: TcpPayloadAdapter,
    @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
    private readonly vendedorResolver: VendedorProfileResolverPort,
  ) {}

  // POST /v1/upload/product-image — auth: VENDEDOR
  @MessagePattern('products.upload_image')
  async uploadProductImage(@Payload() payload: TcpPayload) {
    this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
    await this.vendedorResolver.resolveActiveVendedorIdByAuthUserId(this.payloadAdapter.userId(payload));

    const body = payload.body as Record<string, unknown> | undefined;
    const file = body?.file as string | undefined;
    const mimetype = body?.mimetype as string | undefined;

    if (!file || !mimetype) {
      throw new BadRequestException('file (base64) and mimetype are required');
    }

    const imageId = await this.uploadService.saveImage({ base64: file, mimetype }, 'products');
    return { imageId };
  }
}
