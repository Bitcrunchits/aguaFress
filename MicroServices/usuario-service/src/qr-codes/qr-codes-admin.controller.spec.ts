import { Test, type TestingModule } from '@nestjs/testing';
import { QrCodesAdminController } from './qr-codes-admin.controller';
import { QrCodesService } from './qr-codes.service';
import { ListQrCodesDto } from './dto/list-qr-codes.dto';

const mockQrCodesService = {
  listByVendedor: jest.fn(),
  deactivateAdmin: jest.fn(),
};

describe('QrCodesAdminController', () => {
  let controller: QrCodesAdminController;
  let service: jest.Mocked<typeof mockQrCodesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrCodesAdminController],
      providers: [
        { provide: QrCodesService, useValue: mockQrCodesService },
      ],
    }).compile();

    controller = module.get<QrCodesAdminController>(QrCodesAdminController);
    service = module.get(QrCodesService);
  });

  describe('GET /admin/qr-codes', () => {
    it('delega a QrCodesService.listByVendedor con vendedorId del query y dto', async () => {
      const dto: ListQrCodesDto = {
        page: 1,
        limit: 10,
        vendedorId: 'vendedor-1',
      };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockQrCodesService.listByVendedor.mockResolvedValue(expected);

      const result = await controller.list(dto);

      expect(service.listByVendedor).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });

    it('pasa pagina y limite personalizados', async () => {
      const dto: ListQrCodesDto = {
        page: 2,
        limit: 5,
        vendedorId: 'vendedor-2',
      };
      const expected = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      mockQrCodesService.listByVendedor.mockResolvedValue(expected);

      const result = await controller.list(dto);

      expect(service.listByVendedor).toHaveBeenCalledWith('vendedor-2', dto);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe('PATCH /admin/qr-codes/:id/deactivate', () => {
    it('delega a QrCodesService.deactivateAdmin con id del param', async () => {
      mockQrCodesService.deactivateAdmin.mockResolvedValue(undefined);

      const result = await controller.deactivate('qr-1');

      expect(service.deactivateAdmin).toHaveBeenCalledWith('qr-1');
      expect(result).toBeUndefined();
    });
  });
});
