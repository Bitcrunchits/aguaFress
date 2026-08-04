import { Test } from '@nestjs/testing';
import { $Enums } from '../../generated/prisma';
import {
  DELIVERY_REPOSITORY,
  type DeliveriesRepository,
} from '../../deliveries/deliveries.repository';
import { DeliveryCommandTrackingService } from './delivery-command-tracking.service';
import { DeliveryJobStatus } from '@agua/contracts';

describe('DeliveryCommandTrackingService', () => {
  let service: DeliveryCommandTrackingService;
  let mockRepository: jest.Mocked<DeliveriesRepository>;

  const createInput = {
    trackingId: 'tracking-uuid-1',
    jobId: 'deliveries.update_status:del-1:key-1',
    deliveryId: 'del-1',
    vendedorId: 'vendedor-1',
    actorUserId: 'auth-user-1',
    estado: $Enums.DeliveryEstado.en_camino,
    notas: null,
    idempotencyKey: 'key-1',
    payloadFingerprint: 'abc123',
  };

  const existingRecord = {
    id: 'job-record-id',
    trackingId: 'tracking-uuid-1',
    jobId: 'deliveries.update_status:del-1:key-1',
    deliveryId: 'del-1',
    vendedorId: 'vendedor-1',
    actorUserId: 'auth-user-1',
    estado: $Enums.DeliveryEstado.en_camino,
    notas: null,
    estadoAnterior: null,
    status: $Enums.DeliveryJobStatus.COMPLETED,
    idempotencyKey: 'key-1',
    payloadFingerprint: 'abc123',
    errorCode: null,
    errorMessage: null,
    attempts: 1,
    createdAt: new Date('2026-07-22'),
    updatedAt: new Date('2026-07-22'),
  };

  beforeEach(async () => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      createDeliveryCommandJob: jest.fn(),
      findDeliveryCommandByIdempotency: jest.fn(),
      findDeliveryCommandByTrackingId: jest.fn(),
      updateDeliveryCommandJobStatus: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryCommandTrackingService,
        { provide: DELIVERY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = moduleRef.get(DeliveryCommandTrackingService);
  });

  describe('registerPending', () => {
    it('creates a PENDING record and returns it', async () => {
      mockRepository.createDeliveryCommandJob.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.PENDING,
        attempts: 0,
      });

      const result = await service.registerPending(createInput);

      expect(result.status).toBe($Enums.DeliveryJobStatus.PENDING);
      expect(result.attempts).toBe(0);
      expect(mockRepository.createDeliveryCommandJob).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingId: 'tracking-uuid-1',
          deliveryId: 'del-1',
          idempotencyKey: 'key-1',
        }),
      );
    });

    it('throws DUPLICATE_KEY when (deliveryId, idempotencyKey) already exists', async () => {
      const prismaError = new Error('Unique constraint failed');
      (prismaError as unknown as Record<string, unknown>).code = 'P2002';
      mockRepository.createDeliveryCommandJob.mockRejectedValue(prismaError);

      await expect(service.registerPending(createInput)).rejects.toThrow('DUPLICATE_KEY');
    });

    it('re-throws non-unique errors', async () => {
      const dbError = new Error('Connection lost');
      mockRepository.createDeliveryCommandJob.mockRejectedValue(dbError);

      await expect(service.registerPending(createInput)).rejects.toThrow('Connection lost');
    });
  });

  describe('transitionStatus', () => {
    it('transitions PENDING to PROCESSING', async () => {
      mockRepository.updateDeliveryCommandJobStatus.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.PROCESSING,
      });

      const result = await service.transitionStatus(
        'job-record-id',
        $Enums.DeliveryJobStatus.PENDING,
        $Enums.DeliveryJobStatus.PROCESSING,
      );

      expect(result.status).toBe($Enums.DeliveryJobStatus.PROCESSING);
      expect(mockRepository.updateDeliveryCommandJobStatus).toHaveBeenCalledWith(
        'job-record-id',
        expect.objectContaining({ status: $Enums.DeliveryJobStatus.PROCESSING }),
      );
    });

    it('transitions PROCESSING to COMPLETED with estadoAnterior', async () => {
      mockRepository.updateDeliveryCommandJobStatus.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.COMPLETED,
        estadoAnterior: $Enums.DeliveryEstado.pendiente,
      });

      const result = await service.transitionStatus(
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.COMPLETED,
        { estadoAnterior: $Enums.DeliveryEstado.pendiente },
      );

      expect(result.status).toBe($Enums.DeliveryJobStatus.COMPLETED);
      expect(mockRepository.updateDeliveryCommandJobStatus).toHaveBeenCalledWith(
        'job-record-id',
        expect.objectContaining({
          status: $Enums.DeliveryJobStatus.COMPLETED,
          estadoAnterior: $Enums.DeliveryEstado.pendiente,
        }),
      );
    });

    it('transitions PROCESSING to FAILED with error info', async () => {
      mockRepository.updateDeliveryCommandJobStatus.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.FAILED,
        errorCode: 'BAD_REQUEST',
        errorMessage: 'Invalid transition',
      });

      const result = await service.transitionStatus(
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.FAILED,
        { errorCode: 'BAD_REQUEST', errorMessage: 'Invalid transition' },
      );

      expect(result.status).toBe($Enums.DeliveryJobStatus.FAILED);
      expect(result.errorCode).toBe('BAD_REQUEST');
    });

    it('transitions PROCESSING to RETRYING', async () => {
      mockRepository.updateDeliveryCommandJobStatus.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.RETRYING,
        attempts: 1,
      });

      const result = await service.transitionStatus(
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.RETRYING,
        { attempts: 1 },
      );

      expect(result.status).toBe($Enums.DeliveryJobStatus.RETRYING);
      expect(result.attempts).toBe(1);
    });

    it('transitions RETRYING to PROCESSING (retry re-entry)', async () => {
      mockRepository.updateDeliveryCommandJobStatus.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.PROCESSING,
      });

      const result = await service.transitionStatus(
        'job-record-id',
        $Enums.DeliveryJobStatus.RETRYING,
        $Enums.DeliveryJobStatus.PROCESSING,
      );

      expect(result.status).toBe($Enums.DeliveryJobStatus.PROCESSING);
    });

    it('transitions RETRYING to DEAD_LETTER after exhausted retries', async () => {
      mockRepository.updateDeliveryCommandJobStatus.mockResolvedValue({
        ...existingRecord,
        status: $Enums.DeliveryJobStatus.DEAD_LETTER,
      });

      const result = await service.transitionStatus(
        'job-record-id',
        $Enums.DeliveryJobStatus.RETRYING,
        $Enums.DeliveryJobStatus.DEAD_LETTER,
      );

      expect(result.status).toBe($Enums.DeliveryJobStatus.DEAD_LETTER);
    });
  });

  describe('findByTrackingId', () => {
    it('returns record when found', async () => {
      mockRepository.findDeliveryCommandByTrackingId.mockResolvedValue(existingRecord);

      const result = await service.findByTrackingId('tracking-uuid-1');

      expect(result).toEqual(existingRecord);
    });

    it('returns null when not found', async () => {
      mockRepository.findDeliveryCommandByTrackingId.mockResolvedValue(null);

      const result = await service.findByTrackingId('nonexistent');

      expect(result).toBeNull();
    });
  });
});
