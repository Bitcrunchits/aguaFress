import { Test, type TestingModule } from '@nestjs/testing';
import { VendedoresController } from './vendedores.controller';
import { VendedoresService } from './vendedores.service';
import { ListVendedoresDto } from './dto/list-vendedores.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';
import { ChangeEstadoDto } from './dto/change-estado.dto';
import { VendedorEstado } from '@agua/contracts';

const mockVendedoresService = {
  list: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  changeEstado: jest.fn(),
};

describe('VendedoresController', () => {
  let controller: VendedoresController;
  let service: jest.Mocked<typeof mockVendedoresService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendedoresController],
      providers: [
        { provide: VendedoresService, useValue: mockVendedoresService },
      ],
    }).compile();

    controller = module.get<VendedoresController>(VendedoresController);
    service = module.get(VendedoresService);
  });

  describe('list', () => {
    it('delega a VendedoresService.list con los filtros del query', async () => {
      const filters: ListVendedoresDto = {
        page: 2,
        limit: 10,
        estado: VendedorEstado.ACTIVO,
        search: 'Acme',
      };
      const expected = {
        data: [],
        total: 0,
        page: 2,
        limit: 10,
      };
      mockVendedoresService.list.mockResolvedValue(expected);

      const result = await controller.list(filters);

      expect(service.list).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expected);
    });

    it('delega con valores por defecto cuando no se pasan filtros', async () => {
      const filters: ListVendedoresDto = {};
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      mockVendedoresService.list.mockResolvedValue(expected);

      const result = await controller.list(filters);

      expect(service.list).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expected);
    });
  });

  describe('getById', () => {
    it('delega a VendedoresService.getById con el id del param', async () => {
      const expected = {
        id: 'vendedor-1',
        nombre: 'Juan Pérez',
        estado: VendedorEstado.ACTIVO,
      };
      mockVendedoresService.getById.mockResolvedValue(expected);

      const result = await controller.getById('vendedor-1');

      expect(service.getById).toHaveBeenCalledWith('vendedor-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('delega a VendedoresService.update con id y dto', async () => {
      const dto: UpdateVendedorDto = {
        empresa: 'Nueva SA',
        telefono: '11-5555-0199',
      };
      const expected = {
        id: 'vendedor-1',
        empresa: 'Nueva SA',
        telefono: '11-5555-0199',
        estado: VendedorEstado.ACTIVO,
      };
      mockVendedoresService.update.mockResolvedValue(expected);

      const result = await controller.update('vendedor-1', dto);

      expect(service.update).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });

    it('delega con dto parcial (un solo campo)', async () => {
      const dto: UpdateVendedorDto = { logo: 'https://img.com/logo.png' };
      mockVendedoresService.update.mockResolvedValue(dto);

      await controller.update('vendedor-1', dto);

      expect(service.update).toHaveBeenCalledWith('vendedor-1', { logo: 'https://img.com/logo.png' });
    });
  });

  describe('changeEstado', () => {
    it('delega a VendedoresService.changeEstado con id y dto', async () => {
      const dto: ChangeEstadoDto = {
        estado: VendedorEstado.ACTIVO,
      };
      const expected = {
        vendedorId: 'vendedor-1',
        estadoAnterior: VendedorEstado.PENDIENTE,
        estadoNuevo: VendedorEstado.ACTIVO,
        updated: true,
      };
      mockVendedoresService.changeEstado.mockResolvedValue(expected);

      const result = await controller.changeEstado('vendedor-1', dto);

      expect(service.changeEstado).toHaveBeenCalledWith('vendedor-1', dto);
      expect(result).toEqual(expected);
    });
  });
});
