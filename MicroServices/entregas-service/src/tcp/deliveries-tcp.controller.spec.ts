import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { DeliveryEstado } from '@agua/contracts';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';
import { DeliveriesTcpController } from './deliveries-tcp.controller';

const mockDeliveriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<DeliveriesTcpController>(DeliveriesTcpController);
  });

  //  list

  describe('list', () => {
    it('llama a findAll con vendedorId del token', async () => {
      const payload: TcpPayload = {
        user: { sub: 'vendedor-1', email: 'v@test.com', role: 'vendedor' },
        query: {},
        requestId: 'req-1',
      };
      mockDeliveriesService.findAll.mockResolvedValue({ data: [], pagination: {} });

      await controller.list(payload);

      expect(mockDeliveriesService.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        'vendedor-1',
      );
    });

    it('lanza UnauthorizedException sin usuario en el token', async () => {
      const payload: TcpPayload = { requestId: 'req-1' };

      await expect(controller.list(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
  //  get

  describe('get', () => {
    it('llama a findOne con id y vendedorId del token', async () => {
      const payload: TcpPayload = {
        user: { sub: 'vendedor-1', email: 'v@test.com', role: 'vendedor' },
        params: { id: 'entrega-1' },
        requestId: 'req-1',
      };
      mockDeliveriesService.findOne.mockResolvedValue({ id: 'entrega-1' });

      await controller.get(payload);

      expect(mockDeliveriesService.findOne).toHaveBeenCalledWith('entrega-1', 'vendedor-1');
    });

    it('lanza UnauthorizedException sin usuario en el token', async () => {
      const payload: TcpPayload = { requestId: 'req-1' };

      await expect(controller.get(payload)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════
  //  updateStatus
  // ═══════════════════════════════════════════════

  describe('updateStatus', () => {
    it('llama a updateStatus con id, dto y vendedorId del token', async () => {
      const payload: TcpPayload = {
        user: { sub: 'vendedor-1', email: 'v@test.com', role: 'vendedor' },
        params: { id: 'entrega-1' },
        body: { estado: DeliveryEstado.EN_CAMINO },
        requestId: 'req-1',
      };
      mockDeliveriesService.updateStatus.mockResolvedValue({ id: 'entrega-1', estado: DeliveryEstado.EN_CAMINO });

      await controller.updateStatus(payload);

      expect(mockDeliveriesService.updateStatus).toHaveBeenCalledWith(
        'entrega-1',
        expect.objectContaining({ estado: DeliveryEstado.EN_CAMINO }),
        'vendedor-1',
      );
    });

    it('lanza UnauthorizedException sin usuario en el token', async () => {
      const payload: TcpPayload = { requestId: 'req-1' };

      await expect(controller.updateStatus(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});