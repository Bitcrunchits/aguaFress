import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ProductsTcpController } from './products-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { ProductsService } from '../products/products.service';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../common/usuario-client/vendedor-profile-resolver.port';
import type { TcpPayload } from './tcp-payload';

const PRODUCT_ID = 'cf4439a6-395e-4b52-b33e-82ccbb6f123f';
const CATEGORIA_ID = '3f5a7b1e-3f0a-4c8a-9d2e-1a2b3c4d5e6f';
const AUTH_USER_ID = 'auth-user-1'; // sub del JWT — distinto del vendedorId real
const VENDEDOR_ID_REAL = 'vendedor-real-id-1'; // lo que devuelve el resolver

const mockProductsService = {
  list: jest.fn(),
  findById: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockVendedorResolver = {
  resolveVendedorIdByAuthUserId: jest.fn(),
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
    mockVendedorResolver.resolveVendedorIdByAuthUserId.mockResolvedValue(VENDEDOR_ID_REAL);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsTcpController],
      providers: [
        TcpPayloadAdapter, // real, no mockeado: valida DTOs y roles de verdad
        { provide: ProductsService, useValue: mockProductsService },
        { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useValue: mockVendedorResolver },
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
      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).not.toHaveBeenCalled();
    });

    it('con user CLIENTE autenticado, no intenta resolver vendedorId (no es vendedor)', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({ user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' } }),
      );

      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).not.toHaveBeenCalled();
    });

    it('con user VENDEDOR autenticado y sin vendedorId explícito, resuelve el vendedorId real', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
        }),
      );

      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ vendedorId: VENDEDOR_ID_REAL }),
      );
    });
  });

  describe('get — products.get', () => {
    it('lee el id desde query, no desde params', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID });

      await controller.get(basePayload({ query: { id: PRODUCT_ID } }));

      expect(mockProductsService.findById).toHaveBeenCalledWith(PRODUCT_ID);
    });
  });

  describe('create — products.create', () => {
    it('rechaza sin user autenticado', async () => {
      await expect(
        controller.create(
          basePayload({ body: { nombre: 'x', precioSinIva: 10, categoriaId: CATEGORIA_ID, stock: 1 } }),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el rol no es vendedor', async () => {
      await expect(
        controller.create(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'a@a.com', role: 'cliente' },
            body: { nombre: 'x', precioSinIva: 10, categoriaId: CATEGORIA_ID, stock: 1 },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('resuelve vendedorId real via el puerto, nunca usa el sub ni el body', async () => {
      mockProductsService.create.mockResolvedValue({ id: 'prod-nuevo', created: true });

      await controller.create(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
          body: {
            nombre: 'Bidón 20L',
            precioSinIva: 100,
            categoriaId: CATEGORIA_ID,
            stock: 5,
          },
        }),
      );

      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockProductsService.create).toHaveBeenCalledWith(
        VENDEDOR_ID_REAL, // NO el sub del JWT
        expect.objectContaining({ nombre: 'Bidón 20L' }),
      );
    });
  });
});
