import { Test, type TestingModule } from '@nestjs/testing';
import { VendedorProfileController } from './vendedor-profile.controller';
import { VendedoresService } from './vendedores.service';
import { UpdateVendedorProfileDto } from './dto/update-vendedor-profile.dto';

const mockVendedoresService = {
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
};

describe('VendedorProfileController', () => {
  let controller: VendedorProfileController;
  let service: jest.Mocked<typeof mockVendedoresService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendedorProfileController],
      providers: [
        { provide: VendedoresService, useValue: mockVendedoresService },
      ],
    }).compile();

    controller = module.get<VendedorProfileController>(VendedorProfileController);
    service = module.get(VendedoresService);
  });

  describe('GET /vendedores/me', () => {
    it('delega a VendedoresService.getMyProfile con userId del token', async () => {
      const expected = {
        id: 'vendedor-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        estado: 'activo',
        auth_user: { id: 'user-1', email: 'juan@test.com', role: 'vendedor' },
      };
      mockVendedoresService.getMyProfile.mockResolvedValue(expected);

      const result = await controller.getMyProfile('user-1');

      expect(service.getMyProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('PATCH /vendedores/me', () => {
    it('delega a VendedoresService.updateMyProfile con userId y dto', async () => {
      const dto: UpdateVendedorProfileDto = { nombre: 'Juan Updated', telefono: '11-5555-0101' };
      const expected = {
        id: 'vendedor-1',
        nombre: 'Juan Updated',
        telefono: '11-5555-0101',
        estado: 'activo',
      };
      mockVendedoresService.updateMyProfile.mockResolvedValue(expected);

      const result = await controller.updateMyProfile('user-1', dto);

      expect(service.updateMyProfile).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(expected);
    });
  });
});
