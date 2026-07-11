import { Test, type TestingModule } from '@nestjs/testing';
import { LinkInvitacionAdminController } from './link-invitacion-admin.controller';
import { LinkInvitacionService } from './link-invitacion.service';
import { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';

const mockLinkInvitacionService = {
  listByVendedor: jest.fn(),
  deactivateAdmin: jest.fn(),
};

describe('LinkInvitacionAdminController', () => {
  let controller: LinkInvitacionAdminController;
  let service: jest.Mocked<typeof mockLinkInvitacionService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkInvitacionAdminController],
      providers: [
        { provide: LinkInvitacionService, useValue: mockLinkInvitacionService },
      ],
    }).compile();

    controller = module.get<LinkInvitacionAdminController>(LinkInvitacionAdminController);
    service = module.get(LinkInvitacionService);
  });

  describe('GET /admin/link-invitacion', () => {
    it('delega a LinkInvitacionService.listByVendedor con vendedorId del query y dto', async () => {
      const dto: ListLinkInvitacionDto = {
        page: 1,
        limit: 10,
        vendedorId: 'vendedor-1',
      };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockLinkInvitacionService.listByVendedor.mockResolvedValue(expected);

      const result = await controller.list(dto);

      expect(service.listByVendedor).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });

    it('pasa pagina y limite personalizados', async () => {
      const dto: ListLinkInvitacionDto = {
        page: 2,
        limit: 5,
        vendedorId: 'vendedor-2',
      };
      const expected = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      mockLinkInvitacionService.listByVendedor.mockResolvedValue(expected);

      const result = await controller.list(dto);

      expect(service.listByVendedor).toHaveBeenCalledWith('vendedor-2', dto);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe('PATCH /admin/link-invitacion/:id/deactivate', () => {
    it('delega a LinkInvitacionService.deactivateAdmin con id del param', async () => {
      mockLinkInvitacionService.deactivateAdmin.mockResolvedValue(undefined);

      const result = await controller.deactivate('link-1');

      expect(service.deactivateAdmin).toHaveBeenCalledWith('link-1');
      expect(result).toBeUndefined();
    });
  });
});
