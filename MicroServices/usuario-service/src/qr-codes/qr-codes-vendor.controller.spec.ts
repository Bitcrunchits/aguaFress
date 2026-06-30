import { Test, type TestingModule } from '@nestjs/testing';
import { QrCodesVendorController } from './qr-codes-vendor.controller';
import { QrCodesService } from './qr-codes.service';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

const mockQrCodesService = {
  create: jest.fn(),
  list: jest.fn(),
  deactivate: jest.fn(),
};

describe('QrCodesVendorController', () => {
  let controller: QrCodesVendorController;
  let service: jest.Mocked<typeof mockQrCodesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrCodesVendorController],
      providers: [
        { provide: QrCodesService, useValue: mockQrCodesService },
      ],
    }).compile();

    controller = module.get<QrCodesVendorController>(QrCodesVendorController);
    service = module.get(QrCodesService);
  });

  describe('POST /qr-codes', () => {
    it('delega a QrCodesService.create con userId del token', async () => {
      const expected = {
        id: 'qr-1',
        vendedor_id: 'vendedor-1',
        codigo: 'abc12345',
        activo: true,
        created_at: new Date(),
        expires_at: new Date(),
      };
      mockQrCodesService.create.mockResolvedValue(expected);

      const result = await controller.create('vendedor-1');

      expect(service.create).toHaveBeenCalledWith('vendedor-1');
      expect(result).toEqual({
        qrCode: 'abc12345',
        url: 'https://agua.app/invitar/abc12345',
        expiresAt: expected.expires_at.toISOString(),
      });
    });
  });

  describe('GET /qr-codes', () => {
    it('delega a QrCodesService.list con userId y query params', async () => {
      const dto: ListQrCodesDto = { page: 1, limit: 10 };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockQrCodesService.list.mockResolvedValue(expected);

      const result = await controller.list('vendedor-1', dto);

      expect(service.list).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });

    it('delega con query params personalizados', async () => {
      const dto: ListQrCodesDto = { page: 2, limit: 5 };
      const expected = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      mockQrCodesService.list.mockResolvedValue(expected);

      const result = await controller.list('vendedor-1', dto);

      expect(service.list).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe('PATCH /qr-codes/:id/deactivate', () => {
    it('delega a QrCodesService.deactivate con id del param y userId del token', async () => {
      mockQrCodesService.deactivate.mockResolvedValue(undefined);

      const result = await controller.deactivate('qr-1', 'vendedor-1');

      expect(service.deactivate).toHaveBeenCalledWith('qr-1', 'vendedor-1');
      expect(result).toBeUndefined();
    });
  });
});
