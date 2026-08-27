import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ProductsTcpController } from './products-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import { ProductsService } from '../products/products.service';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../common/usuario-client/vendedor-profile-resolver.port';
import { CLIENTE_VENDEDOR_RESOLVER_PORT } from '../common/usuario-client/cliente-vendedor-resolver.port';
import type { TcpPayload } from './tcp-payload';

const PRODUCT_ID = 'cf4439a6-395e-4b52-b33e-82ccbb6f123f';
const CATEGORIA_ID = '3f5a7b1e-3f0a-4c8a-9d2e-1a2b3c4d5e6f';
const AUTH_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // sub del JWT — distinto del vendedorId real
const VENDEDOR_ID_REAL = '11111111-1111-4111-8111-111111111111'; // lo que devuelve el resolver
const OTRO_VENDEDOR_ID = '22222222-2222-4222-8222-222222222222'; // producto de otro vendedor

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
  resolveActiveVendedorIdByAuthUserId: jest.fn(),
};

const mockClienteVendedorResolver = {
  resolveVendedoresByClienteUserId: jest.fn(),
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
    mockVendedorResolver.resolveActiveVendedorIdByAuthUserId.mockResolvedValue(VENDEDOR_ID_REAL);
    mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsTcpController],
      providers: [
        TcpPayloadAdapter, // real, no mockeado: valida DTOs y roles de verdad
        { provide: ProductsService, useValue: mockProductsService },
        { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useValue: mockVendedorResolver },
        { provide: CLIENTE_VENDEDOR_RESOLVER_PORT, useValue: mockClienteVendedorResolver },
      ],
    }).compile();

    controller = module.get<ProductsTcpController>(ProductsTcpController);
  });

  // ─── LIST ────────────────────────────────────────────────────────

  describe('list — products.list', () => {
    it('sin auth devuelve vacío — no llama al service', async () => {
      const result = await controller.list(basePayload({ query: {} }));

      expect(result).toEqual({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      expect(mockProductsService.list).not.toHaveBeenCalled();
    });

    it('con CLIENTE sin cartera devuelve vacío', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([]);

      const result = await controller.list(
        basePayload({ user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' } }),
      );

      expect(result).toEqual({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      expect(mockClienteVendedorResolver.resolveVendedoresByClienteUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).not.toHaveBeenCalled();
      expect(mockProductsService.list).not.toHaveBeenCalled();
    });

    it('con CLIENTE con cartera única, filtra por ese vendedor automáticamente', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([VENDEDOR_ID_REAL]);
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({ user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' } }),
      );

      expect(mockClienteVendedorResolver.resolveVendedoresByClienteUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ vendedorId: VENDEDOR_ID_REAL }),
      );
    });

    it('con CLIENTE con multi-cartera sin vendedorId explícito, lanza requiresSelection', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([
        VENDEDOR_ID_REAL,
        OTRO_VENDEDOR_ID,
      ]);

      await expect(
        controller.list(
          basePayload({ user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' } }),
        ),
      ).rejects.toThrow(BadRequestException);

      // Verificar el mensaje exacto
      await expect(
        controller.list(
          basePayload({ user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' } }),
        ),
      ).rejects.toThrow('requiresSelection');
    });

    it('con CLIENTE con multi-cartera y vendedorId válido, filtra por ese', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([
        VENDEDOR_ID_REAL,
        OTRO_VENDEDOR_ID,
      ]);
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
          query: { vendedorId: OTRO_VENDEDOR_ID },
        }),
      );

      expect(mockProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ vendedorId: OTRO_VENDEDOR_ID }),
      );
    });

    it('con CLIENTE con multi-cartera y vendedorId inválido, lanza 404', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([VENDEDOR_ID_REAL]);

      await expect(
        controller.list(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
            query: { vendedorId: OTRO_VENDEDOR_ID }, // no está en su cartera
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('con VENDEDOR resuelve vendedorId real y filtra', async () => {
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

    it('con VENDEDOR que manda su propio vendedorId explícito, lo respeta', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
          query: { vendedorId: VENDEDOR_ID_REAL },
        }),
      );

      expect(mockProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ vendedorId: VENDEDOR_ID_REAL }),
      );
    });

    it('con VENDEDOR que manda vendedorId de otro, lanza 404', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await expect(
        controller.list(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
            query: { vendedorId: OTRO_VENDEDOR_ID },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('con SUPER_ADMIN no filtra por vendedor', async () => {
      mockProductsService.list.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 's@test.com', role: 'super_admin' },
          query: { vendedorId: VENDEDOR_ID_REAL },
        }),
      );

      expect(mockProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ vendedorId: VENDEDOR_ID_REAL }),
      );
    });
  });

  // ─── GET ─────────────────────────────────────────────────────────

  describe('get — products.get', () => {
    it('con SUPER_ADMIN retorna el producto sin scoping', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });

      const result = await controller.get(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 's@test.com', role: 'super_admin' },
          query: { id: PRODUCT_ID },
        }),
      );

      expect(mockProductsService.findById).toHaveBeenCalledWith(PRODUCT_ID);
      expect(result).toEqual({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });
    });

    it('sin auth lanza NotFoundException (scoping impide verlo)', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });

      await expect(
        controller.get(basePayload({ query: { id: PRODUCT_ID } })),
      ).rejects.toThrow(NotFoundException);
    });

    it('con CLIENTE que no tiene a este vendedor en cartera, lanza 404', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([OTRO_VENDEDOR_ID]);

      await expect(
        controller.get(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
            query: { id: PRODUCT_ID },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('con CLIENTE que sí tiene al vendedor en cartera, retorna el producto', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([VENDEDOR_ID_REAL]);

      const result = await controller.get(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
          query: { id: PRODUCT_ID },
        }),
      );

      expect(result).toEqual({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });
    });

    it('con VENDEDOR solo ve su propio producto', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });

      const result = await controller.get(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
          query: { id: PRODUCT_ID },
        }),
      );

      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      // El producto es del mismo vendedor → pasa el scope
      expect(result).toEqual({ id: PRODUCT_ID, vendedorId: VENDEDOR_ID_REAL });
    });

    it('con VENDEDOR, producto de otro vendedor da 404', async () => {
      mockProductsService.findById.mockResolvedValue({ id: PRODUCT_ID, vendedorId: OTRO_VENDEDOR_ID });

      await expect(
        controller.get(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
            query: { id: PRODUCT_ID },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── SEARCH ──────────────────────────────────────────────────────

  describe('search — products.search', () => {
    it('sin auth devuelve vacío', async () => {
      const result = await controller.search(basePayload({ query: { q: 'agua' } }));

      expect(result).toEqual({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      expect(mockProductsService.search).not.toHaveBeenCalled();
    });

    it('con VENDEDOR filtra por su vendedorId', async () => {
      mockProductsService.search.mockResolvedValue({ data: [], pagination: {} });

      await controller.search(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
          query: { q: 'bidón' },
        }),
      );

      expect(mockProductsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bidón', vendedorId: VENDEDOR_ID_REAL }),
      );
    });

    it('con CLIENTE con multi-cartera sin vendedorId, lanza requiresSelection en search', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([
        VENDEDOR_ID_REAL,
        OTRO_VENDEDOR_ID,
      ]);

      await expect(
        controller.search(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
            query: { q: 'agua' },
          }),
        ),
      ).rejects.toThrow('requiresSelection');
    });

    it('con CLIENTE multi-cartera y vendedorId válido, search filtra correctamente', async () => {
      mockClienteVendedorResolver.resolveVendedoresByClienteUserId.mockResolvedValue([
        VENDEDOR_ID_REAL,
        OTRO_VENDEDOR_ID,
      ]);
      mockProductsService.search.mockResolvedValue({ data: [], pagination: {} });

      await controller.search(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
          query: { q: 'agua', vendedorId: OTRO_VENDEDOR_ID },
        }),
      );

      expect(mockProductsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'agua', vendedorId: OTRO_VENDEDOR_ID }),
      );
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────

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

    it('resuelve vendedorId activo via el puerto, nunca usa el sub ni el body', async () => {
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

      expect(mockVendedorResolver.resolveActiveVendedorIdByAuthUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockProductsService.create).toHaveBeenCalledWith(
        VENDEDOR_ID_REAL, // NO el sub del JWT
        expect.objectContaining({ nombre: 'Bidón 20L' }),
      );
    });

    it('rechaza creación cuando el vendedor no está activo', async () => {
      mockVendedorResolver.resolveActiveVendedorIdByAuthUserId.mockRejectedValue(new ForbiddenException('inactive'));

      await expect(
        controller.create(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
            body: { nombre: 'Bidón 20L', precioSinIva: 100, categoriaId: CATEGORIA_ID, stock: 5 },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockProductsService.create).not.toHaveBeenCalled();
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────

  describe('update — products.update', () => {
    it('rechaza sin auth', async () => {
      await expect(
        controller.update(
          basePayload({ query: { id: PRODUCT_ID }, body: { nombre: 'x' } }),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si no es vendedor', async () => {
      await expect(
        controller.update(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'c@test.com', role: 'cliente' },
            query: { id: PRODUCT_ID },
            body: { nombre: 'x' },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('actualiza con el vendedorId resuelto', async () => {
      mockProductsService.update.mockResolvedValue({ id: PRODUCT_ID, updated: true });

      await controller.update(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
          query: { id: PRODUCT_ID },
          body: { nombre: 'Bidón 20L Plus', precioSinIva: 120 },
        }),
      );

      expect(mockVendedorResolver.resolveActiveVendedorIdByAuthUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        VENDEDOR_ID_REAL,
        PRODUCT_ID,
        expect.objectContaining({ nombre: 'Bidón 20L Plus' }),
      );
    });

    it('rechaza actualización cuando el vendedor no está activo', async () => {
      mockVendedorResolver.resolveActiveVendedorIdByAuthUserId.mockRejectedValue(new ForbiddenException('inactive'));

      await expect(
        controller.update(
          basePayload({
            user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
            query: { id: PRODUCT_ID },
            body: { nombre: 'Bidón 20L Plus' },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockProductsService.update).not.toHaveBeenCalled();
    });
  });

  // ─── DELETE ──────────────────────────────────────────────────────

  describe('delete — products.delete', () => {
    it('rechaza sin auth', async () => {
      await expect(
        controller.remove(basePayload({ query: { id: PRODUCT_ID } })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('elimina con el vendedorId resuelto', async () => {
      mockProductsService.remove.mockResolvedValue({ id: PRODUCT_ID, deleted: true });

      await controller.remove(
        basePayload({
          user: { sub: AUTH_USER_ID, email: 'v@test.com', role: 'vendedor' },
          query: { id: PRODUCT_ID },
        }),
      );

      expect(mockVendedorResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith(AUTH_USER_ID);
      expect(mockProductsService.remove).toHaveBeenCalledWith(VENDEDOR_ID_REAL, PRODUCT_ID);
    });
  });
});
