import { Test, type TestingModule } from '@nestjs/testing';
import { CategoriesTcpController } from './categories-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { CategoriesService } from '../categories/categories.service';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../common/usuario-client/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

const mockCategoriesService = {
  listCategorias: jest.fn(),
  listMarcas: jest.fn(),
  createCategoria: jest.fn(),
  updateCategoria: jest.fn(),
  deleteCategoria: jest.fn(),
  createMarca: jest.fn(),
  updateMarca: jest.fn(),
  deleteMarca: jest.fn(),
};

const mockVendedorResolver = {
  resolveVendedorIdByAuthUserId: jest.fn(),
};

const VENDEDOR_ID = 'cf4439a6-395e-4b52-b33e-82ccbb6f123f';

function basePayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
  return {
    requestId: 'req-1',
    query: { vendedorId: VENDEDOR_ID },
    ...overrides,
  };
}

describe('CategoriesTcpController (integración con TcpPayloadAdapter real)', () => {
  let controller: CategoriesTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesTcpController],
      providers: [
        TcpPayloadAdapter,
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useValue: mockVendedorResolver },
      ],
    }).compile();

    controller = module.get<CategoriesTcpController>(CategoriesTcpController);
  });

  it('categories.list delega en CategoriesService.listCategorias con el vendedorId del query', async () => {
    mockCategoriesService.listCategorias.mockResolvedValue([]);

    await controller.listCategorias(basePayload());

    expect(mockCategoriesService.listCategorias).toHaveBeenCalledWith(VENDEDOR_ID);
  });

  it('brands.list delega en CategoriesService.listMarcas con el vendedorId del query', async () => {
    mockCategoriesService.listMarcas.mockResolvedValue([]);

    await controller.listMarcas(basePayload());

    expect(mockCategoriesService.listMarcas).toHaveBeenCalledWith(VENDEDOR_ID);
  });

  it('rechaza si falta vendedorId en el query (público, pero requerido)', async () => {
    await expect(controller.listCategorias(basePayload({ query: {} }))).rejects.toThrow();
  });
});
