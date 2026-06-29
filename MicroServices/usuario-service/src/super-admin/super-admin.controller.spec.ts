import { Test, type TestingModule } from '@nestjs/testing';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { UpdateSuperAdminProfileDto } from './dto/update-super-admin.dto';

const mockSuperAdminService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getDashboard: jest.fn(),
};

describe('SuperAdminController', () => {
  let controller: SuperAdminController;
  let service: jest.Mocked<typeof mockSuperAdminService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: SuperAdminService, useValue: mockSuperAdminService },
      ],
    }).compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
    service = module.get(SuperAdminService);
  });

  describe('getProfile', () => {
    it('delega a SuperAdminService.getProfile con userId del token', async () => {
      const expected = {
        id: 'sa-1',
        nombre: 'Admin',
        apellido: 'Root',
        auth_user: { id: 'user-1', email: 'admin@test.com', role: 'super_admin' },
      };
      mockSuperAdminService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile('user-1');

      expect(service.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('updateProfile', () => {
    it('delega a SuperAdminService.updateProfile con userId y dto', async () => {
      const dto: UpdateSuperAdminProfileDto = {
        nombre: 'Super',
        apellido: 'Admin',
      };
      const expected = {
        id: 'sa-1',
        nombre: 'Super',
        apellido: 'Admin',
      };
      mockSuperAdminService.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateProfile('user-1', dto);

      expect(service.updateProfile).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(expected);
    });

    it('delega con dto parcial (un solo campo)', async () => {
      const dto: UpdateSuperAdminProfileDto = { apellido: 'Nuevo' };
      mockSuperAdminService.updateProfile.mockResolvedValue(dto);

      await controller.updateProfile('user-1', dto);

      expect(service.updateProfile).toHaveBeenCalledWith('user-1', { apellido: 'Nuevo' });
    });
  });

  describe('getDashboard', () => {
    it('delega a SuperAdminService.getDashboard con userId del token', async () => {
      const expected = {
        totalVendedores: 10,
        vendedoresActivos: 6,
        vendedoresPendientes: 3,
        totalClientes: 50,
        clientesConVendedor: 40,
        totalSuperAdmins: 2,
      };
      mockSuperAdminService.getDashboard.mockResolvedValue(expected);

      const result = await controller.getDashboard('user-1');

      expect(service.getDashboard).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });
});
