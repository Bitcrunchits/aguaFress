import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ProductsTcpController } from './products-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { ProductsService } from '../products/products.service';
import type { TcpPayload } from './tcp-payload';

const mockProductsService = {
  list: jest.fn(),
  findById: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

function basePayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
  return {
    requestId: 'req-1',
    body: {},
    query: {},
    params: { service: 'products', action: 'list' },
    ...overrides,
  };
}

describe('ProductsTcpController (integración con TcpPayloadAdapter real)', () => {
  let controller: ProductsTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsTcpController],
      providers: [
        TcpPayloadAdapter, // real, no mockeado: valida DTOs y roles de verdad
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    controller = module.get<ProductsTcpController>(ProductsTcpController);
  });

  describe('list — products.list', () => {
    it('sin user y sin vendedorId en query, delega el filtro tal cual (catálogo público)', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(basePayload({ query: {} }));

      const filtrosRecibidos = mockProductsService.list.mock.calls[0][0];
      expect(filtrosRecibidos.vendedorId).toBeUndefined();
    });

    it('con user autenticado y sin vendedorId explícito, usa el vendedorId del JWT (sub)', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({
          user: { sub: 'vendedor-1', email: 'v@test.com', role: 'vendedor' },
        }),
      );

      expect(mockProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ vendedorId: 'vendedor-1' }),
      );
    });
  });

  describe('get — products.get', () => {
    it('lee el id desde query, no desde params', async () => {
      mockProductsService.findById.mockResolvedValue({ id: 'prod-1' });

      await controller.get(basePayload({ query: { id: '11111111-1111-1111-1111-111111111111' } }));

      expect(mockProductsService.findById).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    });
  });

  describe('create — products.create', () => {
    it('rechaza sin user autenticado', async () => {
      await expect(
        controller.create(basePayload({ body: { nombre: 'x', precioSinIva: 10, categoriaId: 'c1', stock: 1 } })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el rol no es vendedor', async () => {
      await expect(
        controller.create(
          basePayload({
            user: { sub: 'u1', email: 'a@a.com', role: 'cliente' },
            body: { nombre: 'x', precioSinIva: 10, categoriaId: 'c1', stock: 1 },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('inyecta vendedorId desde el JWT, nunca desde el body', async () => {
      mockProductsService.create.mockResolvedValue({ id: 'prod-nuevo', created: true });

      await controller.create(
        basePayload({
          user: { sub: 'vendedor-1', email: 'v@test.com', role: 'vendedor' },
          body: {
            nombre: 'Bidón 20L',
            precioSinIva: 100,
            categoriaId: '11111111-1111-1111-1111-111111111111',
            stock: 5,
          },
        }),
      );

      expect(mockProductsService.create).toHaveBeenCalledWith(
        'vendedor-1',
        expect.objectContaining({ nombre: 'Bidón 20L' }),
      );
    });
  });
});
