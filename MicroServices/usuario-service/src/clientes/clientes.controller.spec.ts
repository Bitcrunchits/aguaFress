import { Test, type TestingModule } from '@nestjs/testing';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { ListClientesDto } from './dto/list-clientes.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ReasignarVendedorDto } from './dto/reasignar-vendedor.dto';

const mockClientesService = {
  list: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  reassign: jest.fn(),
};

describe('ClientesController', () => {
  let controller: ClientesController;
  let service: jest.Mocked<typeof mockClientesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [
        { provide: ClientesService, useValue: mockClientesService },
      ],
    }).compile();

    controller = module.get<ClientesController>(ClientesController);
    service = module.get(ClientesService);
  });

  describe('list', () => {
    it('delega a ClientesService.list con los filtros del query', async () => {
      const filters: ListClientesDto = {
        page: 2,
        limit: 10,
        vendedor_id: 'abc-123',
        search: 'Juan',
      };
      const expected = {
        data: [],
        total: 0,
        page: 2,
        limit: 10,
      };
      mockClientesService.list.mockResolvedValue(expected);

      const result = await controller.list(filters);

      expect(service.list).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expected);
    });

    it('delega con valores por defecto cuando no se pasan filtros', async () => {
      const filters: ListClientesDto = {};
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockClientesService.list.mockResolvedValue(expected);

      const result = await controller.list(filters);

      expect(service.list).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expected);
    });
  });

  describe('getById', () => {
    it('delega a ClientesService.getById con el id del param', async () => {
      const expected = {
        id: 'cliente-1',
        nombre: 'Juan',
        apellido: 'Pérez',
      };
      mockClientesService.getById.mockResolvedValue(expected);

      const result = await controller.getById('cliente-1');

      expect(service.getById).toHaveBeenCalledWith('cliente-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('delega a ClientesService.update con id y dto', async () => {
      const dto: UpdateClienteDto = {
        nombre: 'Juan Updated',
        telefono: '11-5555-0199',
      };
      const expected = {
        id: 'cliente-1',
        nombre: 'Juan Updated',
        telefono: '11-5555-0199',
      };
      mockClientesService.update.mockResolvedValue(expected);

      const result = await controller.update('cliente-1', dto);

      expect(service.update).toHaveBeenCalledWith('cliente-1', dto);
      expect(result).toEqual(expected);
    });

    it('delega con dto parcial (un solo campo)', async () => {
      const dto: UpdateClienteDto = { nombre: 'Solo nombre' };
      mockClientesService.update.mockResolvedValue(dto);

      await controller.update('cliente-1', dto);

      expect(service.update).toHaveBeenCalledWith('cliente-1', { nombre: 'Solo nombre' });
    });
  });

  describe('reassign', () => {
    it('delega a ClientesService.reassign con id y dto', async () => {
      const dto: ReasignarVendedorDto = { vendedorId: 'vendedor-99' };
      const expected = {
        id: 'cliente-1',
        vendedor_id: 'vendedor-99',
      };
      mockClientesService.reassign.mockResolvedValue(expected);

      const result = await controller.reassign('cliente-1', dto);

      expect(service.reassign).toHaveBeenCalledWith('cliente-1', dto);
      expect(result).toEqual(expected);
    });
  });
});
