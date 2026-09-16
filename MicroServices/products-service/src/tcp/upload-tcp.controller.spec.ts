import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import { ProductsUploadTcpController } from './upload-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { UploadService } from '../common/upload/upload.service';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../common/usuario-client/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

const mockUploadService = {
  saveImage: jest.fn(),
};

const mockVendedorResolver = {
  resolveActiveVendedorIdByAuthUserId: jest.fn(),
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

describe('ProductsUploadTcpController', () => {
  let controller: ProductsUploadTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVendedorResolver.resolveActiveVendedorIdByAuthUserId.mockResolvedValue('vendedor-1');
    mockUploadService.saveImage.mockResolvedValue('products/product.webp');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsUploadTcpController],
      providers: [
        TcpPayloadAdapter,
        { provide: UploadService, useValue: mockUploadService },
        { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useValue: mockVendedorResolver },
      ],
    }).compile();

    controller = module.get(ProductsUploadTcpController);
  });

  it('sube imagen de producto solo después de validar vendedor activo por auth user', async () => {
    const result = await controller.uploadProductImage(vendedorPayload());

    expect(mockVendedorResolver.resolveActiveVendedorIdByAuthUserId).toHaveBeenCalledWith('auth-user-1');
    expect(mockUploadService.saveImage).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/png' }),
      'products',
    );
    expect(result).toEqual({ imageId: 'products/product.webp' });
  });

  it('rechaza imagen cuando el vendedor no está activo', async () => {
    mockVendedorResolver.resolveActiveVendedorIdByAuthUserId.mockRejectedValue(new ForbiddenException('inactive'));

    await expect(controller.uploadProductImage(vendedorPayload())).rejects.toThrow(ForbiddenException);
    expect(mockUploadService.saveImage).not.toHaveBeenCalled();
  });
});
