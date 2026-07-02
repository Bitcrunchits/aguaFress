import { Test, type TestingModule } from '@nestjs/testing';
import { QrCodesVendorController } from './qr-codes-vendor.controller';
import { QrCodesService } from './qr-codes.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

const mockQrCodesService = {
  create: jest.fn(),
  list: jest.fn(),
  deactivate: jest.fn(),
};

const mockVendedorResolver = {
  resolve: jest.fn(),
};

describe('QrCodesVendorController', () => {
  let controller: QrCodesVendorController;
  let service: jest.Mocked<typeof mockQrCodesService>;
  let resolver: jest.Mocked<typeof mockVendedorResolver>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrCodesVendorController],
      providers: [
        { provide: QrCodesService, useValue: mockQrCodesService },
        { provide: VendedorResolver, useValue: mockVendedorResolver },
      ],
    }).compile();

    controller = module.get<QrCodesVendorController>(QrCodesVendorController);
    service = module.get(QrCodesService);
    resolver = module.get(VendedorResolver);
  });

  describe('POST /qr-codes', () => {
    it('resuelve vendedorId y delega a QrCodesService.create', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');

      const expected = {
        id: 'qr-1',
        vendedor_id: 'vendedor-1',
        codigo: 'abc12345',
        activo: true,
        created_at: new Date(),
        expires_at: new Date(),
      };
      mockQrCodesService.create.mockResolvedValue(expected);

      const result = await controller.create('auth-user-1');

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.create).toHaveBeenCalledWith('vendedor-1');
      expect(result).toEqual({
        qrCode: 'abc12345',
        url: 'https://agua.app/invitar/abc12345',
        expiresAt: expected.expires_at.toISOString(),
      });
    });
  });

  describe('GET /qr-codes', () => {
    it('resuelve vendedorId y delega a QrCodesService.list', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');

      const dto: ListQrCodesDto = { page: 1, limit: 10 };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockQrCodesService.list.mockResolvedValue(expected);

      const result = await controller.list('auth-user-1', dto);

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.list).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });

    it('delega con query params personalizados', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');

      const dto: ListQrCodesDto = { page: 2, limit: 5 };
      const expected = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      mockQrCodesService.list.mockResolvedValue(expected);

      const result = await controller.list('auth-user-1', dto);

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.list).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe('PATCH /qr-codes/:id/deactivate', () => {
    it('resuelve vendedorId y delega a QrCodesService.deactivate', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');
      mockQrCodesService.deactivate.mockResolvedValue(undefined);

      const result = await controller.deactivate('qr-1', 'auth-user-1');

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.deactivate).toHaveBeenCalledWith('qr-1', 'vendedor-1');
      expect(result).toBeUndefined();
    });
  });
});
