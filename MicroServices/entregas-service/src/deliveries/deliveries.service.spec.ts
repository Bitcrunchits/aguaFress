import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DeliveryEstado } from '@agua/contracts';
import { $Enums } from '../generated/prisma';
import { DeliveriesService } from './deliveries.service';
import { DELIVERY_REPOSITORY, type DeliveryRecord, type DeliveriesRepository } from './deliveries.repository';
import { DELIVERY_EVENT_PUBLISHER, type DeliveryEventPublisher } from './delivery-event-publisher.port';

const mockRepository: jest.Mocked<DeliveriesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
};

const mockPublisher: jest.Mocked<DeliveryEventPublisher> = {
  publishStatusChanged: jest.fn(),
  publishStarted: jest.fn(),
  publishCompleted: jest.fn(),
};

const entregaBaseRecord: DeliveryRecord = {
  id: 'entrega-1',
  orderId: 'order-1',
  vendedorId: 'vendedor-1',
  clienteId: 'cli-1',
  estado: 'pendiente' as $Enums.DeliveryEstado,
  clienteNombre: 'Juan Pérez',
  clienteTelefono: null,
  direccionCalle: 'Calle Falsa',
  direccionNumero: '1234',
  direccionPiso: null,
  direccionReferencia: null,
  direccionBarrio: null,
  direccionCiudad: 'Ciudad',
  direccionProvincia: 'Provincia',
  direccionCp: null,
  latitud: null,
  longitud: null,
  fechaAsignacion: new Date('2026-07-07'),
  fechaEntrega: null,
  notas: null,
};

describe('DeliveriesService', () => {
  let service: DeliveriesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: DELIVERY_REPOSITORY, useValue: mockRepository },
        { provide: DELIVERY_EVENT_PUBLISHER, useValue: mockPublisher },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  //  findOne

  describe('findOne', () => {
    it('devuelve la entrega si pertenece al vendedor', async () => {
      mockRepository.findById.mockResolvedValue(entregaBaseRecord);

      const result = await service.findOne('entrega-1', 'vendedor-1');

      expect(result.id).toBe('entrega-1');
      expect(result.vendedorId).toBe('vendedor-1');
    });

    it('lanza NotFoundException si la entrega no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('fake-id', 'vendedor-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si la entrega pertenece a otro vendedor', async () => {
      mockRepository.findById.mockResolvedValue(entregaBaseRecord);

      await expect(service.findOne('entrega-1', 'otro-vendedor')).rejects.toThrow(ForbiddenException);
    });
  });

  //  updateStatus — transiciones válidas

  describe('updateStatus — transiciones válidas', () => {
    it('PENDIENTE → EN_CAMINO es válida y publica DeliveryStarted + DeliveryStatusChanged', async () => {
      mockRepository.findById.mockResolvedValue(entregaBaseRecord);
      mockRepository.updateStatus.mockResolvedValue({
        ...entregaBaseRecord,
        estado: 'en_camino' as $Enums.DeliveryEstado,
      });

      const result = await service.updateStatus(
        'entrega-1',
        { estado: DeliveryEstado.EN_CAMINO },
        'vendedor-1',
        'user-abc',
      );

      expect(mockRepository.updateStatus).toHaveBeenCalled();
      expect(result.estado).toBe(DeliveryEstado.EN_CAMINO);
      expect(mockPublisher.publishStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DeliveryStarted',
          deliveryId: 'entrega-1',
          orderId: 'order-1',
          vendedorId: 'vendedor-1',
          clienteId: 'cli-1',
          actorUserId: 'user-abc',
        }),
      );
      expect(mockPublisher.publishStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DeliveryStatusChanged',
          deliveryId: 'entrega-1',
          orderId: 'order-1',
          estadoAnterior: DeliveryEstado.PENDIENTE,
          estadoNuevo: DeliveryEstado.EN_CAMINO,
          actorUserId: 'user-abc',
        }),
      );
    });

    it('EN_CAMINO → ENTREGADA es válida y publica DeliveryCompleted + DeliveryStatusChanged', async () => {
      mockRepository.findById.mockResolvedValue({
        ...entregaBaseRecord,
        estado: 'en_camino' as $Enums.DeliveryEstado,
      });
      mockRepository.updateStatus.mockResolvedValue({
        ...entregaBaseRecord,
        estado: 'entregada' as $Enums.DeliveryEstado,
        fechaEntrega: new Date(),
      });

      const result = await service.updateStatus(
        'entrega-1',
        { estado: DeliveryEstado.ENTREGADA },
        'vendedor-1',
        'user-abc',
      );

      expect(result.estado).toBe(DeliveryEstado.ENTREGADA);
      expect(mockPublisher.publishCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DeliveryCompleted',
          deliveryId: 'entrega-1',
          orderId: 'order-1',
          vendedorId: 'vendedor-1',
          clienteId: 'cli-1',
          actorUserId: 'user-abc',
        }),
      );
      expect(mockPublisher.publishStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 'entrega-1',
          estadoAnterior: DeliveryEstado.EN_CAMINO,
          estadoNuevo: DeliveryEstado.ENTREGADA,
          actorUserId: 'user-abc',
        }),
      );
    });
  });

  //  updateStatus — transiciones inválidas

  describe('updateStatus — transiciones inválidas', () => {
    it('PENDIENTE → ENTREGADA lanza 400 y no publica evento', async () => {
      mockRepository.findById.mockResolvedValue(entregaBaseRecord);

      await expect(
        service.updateStatus('entrega-1', { estado: DeliveryEstado.ENTREGADA }, 'vendedor-1', 'user-abc'),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
      expect(mockPublisher.publishStatusChanged).not.toHaveBeenCalled();
      expect(mockPublisher.publishStarted).not.toHaveBeenCalled();
      expect(mockPublisher.publishCompleted).not.toHaveBeenCalled();
    });

    it('ENTREGADA → EN_CAMINO lanza 400 y no publica evento', async () => {
      mockRepository.findById.mockResolvedValue({
        ...entregaBaseRecord,
        estado: 'entregada' as $Enums.DeliveryEstado,
      });

      await expect(
        service.updateStatus('entrega-1', { estado: DeliveryEstado.EN_CAMINO }, 'vendedor-1', 'user-abc'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPublisher.publishStatusChanged).not.toHaveBeenCalled();
      expect(mockPublisher.publishStarted).not.toHaveBeenCalled();
      expect(mockPublisher.publishCompleted).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la entrega no existe', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus('fake-id', { estado: DeliveryEstado.EN_CAMINO }, 'vendedor-1', 'user-abc'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPublisher.publishStatusChanged).not.toHaveBeenCalled();
      expect(mockPublisher.publishStarted).not.toHaveBeenCalled();
      expect(mockPublisher.publishCompleted).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si la entrega pertenece a otro vendedor', async () => {
      mockRepository.findById.mockResolvedValue(entregaBaseRecord);

      await expect(
        service.updateStatus('entrega-1', { estado: DeliveryEstado.EN_CAMINO }, 'otro-vendedor', 'user-abc'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPublisher.publishStatusChanged).not.toHaveBeenCalled();
      expect(mockPublisher.publishStarted).not.toHaveBeenCalled();
      expect(mockPublisher.publishCompleted).not.toHaveBeenCalled();
    });
  });
});
