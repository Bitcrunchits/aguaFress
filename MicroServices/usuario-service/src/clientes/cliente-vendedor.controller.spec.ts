import { Test, type TestingModule } from '@nestjs/testing';
import { ClienteVendedorController } from './cliente-vendedor.controller';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteVendedorDto } from './dto/update-cliente-vendedor.dto';

const mockClientesService = {
  listOwn: jest.fn(),
  getOwnById: jest.fn(),
  updateOwn: jest.fn(),
};

describe('ClienteVendedorController', () => {
  let controller: ClienteVendedorController;
  let service: jest.Mocked<typeof mockClientesService>;

  const mockUserId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClienteVendedorController],
      providers: [
        { provide: ClientesService, useValue: mockClientesService },
      ],
    }).compile();

    controller = module.get<ClienteVendedorController>(ClienteVendedorController);
    service = module.get(ClientesService);
  });

  describe('listOwn', () => {
    it('delega a ClientesService.listOwn con userId y filtros', async () => {
      const filters: ListClientesDto = {
        page: 1,
        limit: 10,
        search: 'Juan',
      };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockClientesService.listOwn.mockResolvedValue(expected);

      const result = await controller.listOwn(mockUserId, filters);

      expect(service.listOwn).toHaveBeenCalledWith(mockUserId, filters);
      expect(result).toEqual(expected);
    });

    it('delega con valores por defecto cuando no se pasan filtros', async () => {
      const filters: ListClientesDto = {};
      const expected = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockClientesService.listOwn.mockResolvedValue(expected);

      const result = await controller.listOwn(mockUserId, filters);

      expect(service.listOwn).toHaveBeenCalledWith(mockUserId, filters);
      expect(result).toEqual(expected);
    });
  });

  describe('getOwnById', () => {
    it('delega a ClientesService.getOwnById con id y userId', async () => {
      const expected = {
        id: 'cliente-1',
        nombre: 'Juan',
        apellido: 'Pérez',
      };
      mockClientesService.getOwnById.mockResolvedValue(expected);

      const result = await controller.getOwnById('cliente-1', mockUserId);

      expect(service.getOwnById).toHaveBeenCalledWith('cliente-1', mockUserId);
      expect(result).toEqual(expected);
    });
  });

  describe('updateOwn', () => {
    it('delega a ClientesService.updateOwn con id, userId y dto', async () => {
      const dto: UpdateClienteVendedorDto = {
        nombre: 'Cliente Updated',
        telefono: '11-5555-0199',
      };
      const expected = {
        id: 'cliente-1',
        nombre: 'Cliente Updated',
        telefono: '11-5555-0199',
      };
      mockClientesService.updateOwn.mockResolvedValue(expected);

      const result = await controller.updateOwn('cliente-1', mockUserId, dto);

      expect(service.updateOwn).toHaveBeenCalledWith('cliente-1', mockUserId, dto);
      expect(result).toEqual(expected);
    });

    it('delega con dto parcial (un solo campo)', async () => {
      const dto: UpdateClienteVendedorDto = { nombre: 'Solo nombre' };
      mockClientesService.updateOwn.mockResolvedValue(dto);

      await controller.updateOwn('cliente-1', mockUserId, dto);

      expect(service.updateOwn).toHaveBeenCalledWith('cliente-1', mockUserId, { nombre: 'Solo nombre' });
    });
  });
});
