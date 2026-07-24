import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';
import { DeliveriesTcpController } from './deliveries-tcp.controller';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../deliveries/vendedor-profile-resolver.port';
import { DELIVERY_REPOSITORY } from '../deliveries/deliveries.repository';

const mockDeliveriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
};

const mockDeliveryRepository = {
  createDeliveryCommandJob: jest.fn(),
  findDeliveryCommandByIdempotency: jest.fn(),
  findDeliveryCommandByTrackingId: jest.fn(),
  updateDeliveryCommandJobStatus: jest.fn(),
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
        { provide: DELIVERY_REPOSITORY, useValue: mockDeliveryRepository },
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

});
