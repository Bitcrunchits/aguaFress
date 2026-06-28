import { Test, type TestingModule } from '@nestjs/testing';
import { ClienteVendedorController } from './cliente-vendedor.controller';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteVendedorDto } from './dto/update-cliente-vendedor.dto';

const mockClientesService = {
  listMios: jest.fn(),
  getByIdMio: jest.fn(),
  updateMio: jest.fn(),
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

  describe('listMios', () => {
    it('delega a ClientesService.listMios con userId y filtros', async () => {
      const filters: ListClientesDto = {
        page: 1,
        limit: 10,
        search: 'Juan',
      };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockClientesService.listMios.mockResolvedValue(expected);

      const result = await controller.listMios(mockUserId, filters);

      expect(service.listMios).toHaveBeenCalledWith(mockUserId, filters);
      expect(result).toEqual(expected);
    });

    it('delega con valores por defecto cuando no se pasan filtros', async () => {
      const filters: ListClientesDto = {};
      const expected = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockClientesService.listMios.mockResolvedValue(expected);

      const result = await controller.listMios(mockUserId, filters);

      expect(service.listMios).toHaveBeenCalledWith(mockUserId, filters);
      expect(result).toEqual(expected);
    });
  });

  describe('getByIdMio', () => {
    it('delega a ClientesService.getByIdMio con id y userId', async () => {
      const expected = {
        id: 'cliente-1',
        nombre: 'Juan',
        apellido: 'Pérez',
      };
      mockClientesService.getByIdMio.mockResolvedValue(expected);

      const result = await controller.getByIdMio('cliente-1', mockUserId);

      expect(service.getByIdMio).toHaveBeenCalledWith('cliente-1', mockUserId);
      expect(result).toEqual(expected);
    });
  });

  describe('updateMio', () => {
    it('delega a ClientesService.updateMio con id, userId y dto', async () => {
      const dto: UpdateClienteVendedorDto = {
        nombre: 'Cliente Updated',
        telefono: '11-5555-0199',
      };
      const expected = {
        id: 'cliente-1',
        nombre: 'Cliente Updated',
        telefono: '11-5555-0199',
      };
      mockClientesService.updateMio.mockResolvedValue(expected);

      const result = await controller.updateMio('cliente-1', mockUserId, dto);

      expect(service.updateMio).toHaveBeenCalledWith('cliente-1', mockUserId, dto);
      expect(result).toEqual(expected);
    });

    it('delega con dto parcial (un solo campo)', async () => {
      const dto: UpdateClienteVendedorDto = { nombre: 'Solo nombre' };
      mockClientesService.updateMio.mockResolvedValue(dto);

      await controller.updateMio('cliente-1', mockUserId, dto);

      expect(service.updateMio).toHaveBeenCalledWith('cliente-1', mockUserId, { nombre: 'Solo nombre' });
    });
  });
});
