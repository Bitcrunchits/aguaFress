import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import { UsuarioUploadTcpController } from './upload-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { UploadService } from '../common/upload/upload.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import type { TcpPayload } from './tcp-payload';

const mockUploadService = {
  saveImage: jest.fn(),
};

const mockVendedorResolver = {
  resolveActive: jest.fn(),
};

function vendedorPayload(): TcpPayload {
  return {
    requestId: 'req-1',
    body: { file: Buffer.from('image').toString('base64'), mimetype: 'image/png' },
    query: {},
    params: {},
    user: { sub: 'auth-user-1', email: 'v@test.com', role: UserRole.VENDEDOR },
  };
}

describe('UsuarioUploadTcpController', () => {
  let controller: UsuarioUploadTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVendedorResolver.resolveActive.mockResolvedValue('vendedor-1');
    mockUploadService.saveImage.mockResolvedValue('logos/logo.webp');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioUploadTcpController],
      providers: [
        TcpPayloadAdapter,
        { provide: UploadService, useValue: mockUploadService },
        { provide: VendedorResolver, useValue: mockVendedorResolver },
      ],
    }).compile();

    controller = module.get(UsuarioUploadTcpController);
  });

  it('sube logo solo después de validar vendedor activo por auth user', async () => {
    const result = await controller.uploadVendorLogo(vendedorPayload());

    expect(mockVendedorResolver.resolveActive).toHaveBeenCalledWith('auth-user-1');
    expect(mockUploadService.saveImage).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/png' }),
      'logos',
    );
    expect(result).toEqual({ imageId: 'logos/logo.webp' });
  });

  it('rechaza logo cuando el vendedor no está activo', async () => {
    mockVendedorResolver.resolveActive.mockRejectedValue(new ForbiddenException('inactive'));

    await expect(controller.uploadVendorLogo(vendedorPayload())).rejects.toThrow(ForbiddenException);
    expect(mockUploadService.saveImage).not.toHaveBeenCalled();
  });
});
