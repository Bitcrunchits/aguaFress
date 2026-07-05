import { Test, type TestingModule } from '@nestjs/testing';
import { LinkInvitacionVendorController } from './link-invitacion-vendor.controller';
import { LinkInvitacionService } from './link-invitacion.service';
import { VendedorResolver } from '../common/prisma/vendedor-resolver.service';
import { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';

const mockLinkInvitacionService = {
  create: jest.fn(),
  list: jest.fn(),
  deactivate: jest.fn(),
};

const mockVendedorResolver = {
  resolve: jest.fn(),
};

describe('LinkInvitacionVendorController', () => {
  let controller: LinkInvitacionVendorController;
  let service: jest.Mocked<typeof mockLinkInvitacionService>;
  let resolver: jest.Mocked<typeof mockVendedorResolver>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkInvitacionVendorController],
      providers: [
        { provide: LinkInvitacionService, useValue: mockLinkInvitacionService },
        { provide: VendedorResolver, useValue: mockVendedorResolver },
      ],
    }).compile();

    controller = module.get<LinkInvitacionVendorController>(LinkInvitacionVendorController);
    service = module.get(LinkInvitacionService);
    resolver = module.get(VendedorResolver);
  });

  describe('POST /link-invitacion', () => {
    it('resuelve vendedorId y delega a LinkInvitacionService.create', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');

      const expected = {
        id: 'link-1',
        vendedor_id: 'vendedor-1',
        token: 'abc12345',
        activo: true,
        created_at: new Date(),
        expires_at: new Date(),
      };
      mockLinkInvitacionService.create.mockResolvedValue(expected);

      const result = await controller.create('auth-user-1');

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.create).toHaveBeenCalledWith('vendedor-1');
      expect(result).toEqual({
        linkUrl: 'https://agua.app/invitar/abc12345',
        token: 'abc12345',
        expiresAt: expected.expires_at.toISOString(),
      });
    });
  });

  describe('GET /link-invitacion', () => {
    it('resuelve vendedorId y delega a LinkInvitacionService.list', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');

      const dto: ListLinkInvitacionDto = { page: 1, limit: 10 };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockLinkInvitacionService.list.mockResolvedValue(expected);

      const result = await controller.list('auth-user-1', dto);

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.list).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });

    it('delega con query params personalizados', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');

      const dto: ListLinkInvitacionDto = { page: 2, limit: 5 };
      const expected = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      mockLinkInvitacionService.list.mockResolvedValue(expected);

      const result = await controller.list('auth-user-1', dto);

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.list).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe('PATCH /link-invitacion/:id/deactivate', () => {
    it('resuelve vendedorId y delega a LinkInvitacionService.deactivate', async () => {
      mockVendedorResolver.resolve.mockResolvedValue('vendedor-1');
      mockLinkInvitacionService.deactivate.mockResolvedValue(undefined);

      const result = await controller.deactivate('link-1', 'auth-user-1');

      expect(resolver.resolve).toHaveBeenCalledWith('auth-user-1');
      expect(service.deactivate).toHaveBeenCalledWith('link-1', 'vendedor-1');
      expect(result).toBeUndefined();
    });
  });
});
