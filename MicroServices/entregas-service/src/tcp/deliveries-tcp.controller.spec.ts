import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { DeliveryEstado, UserRole } from '@agua/contracts';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';
import { DeliveriesTcpController } from './deliveries-tcp.controller';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../deliveries/vendedor-profile-resolver.port';

const mockDeliveriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
};

const mockVendedorProfileResolver = {
  resolveVendedorIdByAuthUserId: jest.fn(),
};

describe('DeliveriesTcpController', () => {
  let controller: DeliveriesTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveriesTcpController],
      providers: [
        TcpPayloadAdapter,
        { provide: DeliveriesService, useValue: mockDeliveriesService },
        { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useValue: mockVendedorProfileResolver },
      ],
    }).compile();

    controller = module.get<DeliveriesTcpController>(DeliveriesTcpController);
  });

  describe('list', () => {
    it('resuelve vendedorId y llama a findAll con el id resuelto', async () => {
      const payload: TcpPayload = {
        user: { sub: 'vendedor-1', email: 'v@test.com', role: UserRole.VENDEDOR },
        query: {},
        requestId: 'req-1',
      };
      mockVendedorProfileResolver.resolveVendedorIdByAuthUserId.mockResolvedValue('resolved-vendedor-id');
      mockDeliveriesService.findAll.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(payload);

      expect(mockVendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith('vendedor-1');
      expect(mockDeliveriesService.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        'resolved-vendedor-id',
      );
    });

    it('lanza UnauthorizedException sin usuario en el token', async () => {
      const payload: TcpPayload = { requestId: 'req-1' };

      await expect(controller.list(payload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('get', () => {
    it('resuelve vendedorId y llama a findOne con el id resuelto', async () => {
      const payload: TcpPayload = {
        user: { sub: 'vendedor-1', email: 'v@test.com', role: UserRole.VENDEDOR },
        params: { id: 'entrega-1' },
        requestId: 'req-1',
      };
      mockVendedorProfileResolver.resolveVendedorIdByAuthUserId.mockResolvedValue('resolved-vendedor-id');
      mockDeliveriesService.findOne.mockResolvedValue({ id: 'entrega-1' });

      await controller.get(payload);

      expect(mockVendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith('vendedor-1');
      expect(mockDeliveriesService.findOne).toHaveBeenCalledWith('entrega-1', 'resolved-vendedor-id');
    });

    it('lanza UnauthorizedException sin usuario en el token', async () => {
      const payload: TcpPayload = { requestId: 'req-1' };

      await expect(controller.get(payload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateStatus', () => {
    it('resuelve vendedorId y llama a updateStatus con actorUserId', async () => {
      const payload: TcpPayload = {
        user: { sub: 'vendedor-1', email: 'v@test.com', role: UserRole.VENDEDOR },
        params: { id: 'entrega-1' },
        body: { estado: DeliveryEstado.EN_CAMINO },
        requestId: 'req-1',
      };
      mockVendedorProfileResolver.resolveVendedorIdByAuthUserId.mockResolvedValue('resolved-vendedor-id');
      mockDeliveriesService.updateStatus.mockResolvedValue({ id: 'entrega-1', estado: DeliveryEstado.EN_CAMINO });

      await controller.updateStatus(payload);

      expect(mockVendedorProfileResolver.resolveVendedorIdByAuthUserId).toHaveBeenCalledWith('vendedor-1');
      expect(mockDeliveriesService.updateStatus).toHaveBeenCalledWith(
        'entrega-1',
        expect.objectContaining({ estado: DeliveryEstado.EN_CAMINO }),
        'resolved-vendedor-id',
        'vendedor-1',
      );
    });

    it('lanza UnauthorizedException sin usuario en el token', async () => {
      const payload: TcpPayload = { requestId: 'req-1' };

      await expect(controller.updateStatus(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
