import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { Roles } from '../auth/roles.guard';
import { TcpDispatcherService, type TcpCommandPayload } from '../tcp/tcp-dispatcher.service';
import type { ActionMapping } from '../actions/action-registry';

@Controller('v1/upload')
export class UploadProxyController {
  constructor(private readonly dispatcher: TcpDispatcherService) {}

  @Post('product-image')
  @Roles('vendedor')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const base64 = file.buffer.toString('base64');
    const user = (req as unknown as { user?: { sub: string; email: string; role: string } }).user;

    const payload: TcpCommandPayload = {
      body: { file: base64, mimetype: file.mimetype },
      query: {},
      params: {},
      user,
      requestId: randomUUID(),
    };

    const mapping: ActionMapping = {
      tcpPattern: 'products.upload_image',
      transport: 'send',
    };

    return this.dispatcher.dispatch('products', payload, mapping);
  }

  @Post('vendor-logo')
  @Roles('vendedor')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVendorLogo(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const base64 = file.buffer.toString('base64');
    const user = (req as unknown as { user?: { sub: string; email: string; role: string } }).user;

    const payload: TcpCommandPayload = {
      body: { file: base64, mimetype: file.mimetype },
      query: {},
      params: {},
      user,
      requestId: randomUUID(),
    };

    const mapping: ActionMapping = {
      tcpPattern: 'users.upload_logo',
      transport: 'send',
    };

    return this.dispatcher.dispatch('users', payload, mapping);
  }
}
