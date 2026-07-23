import { Test } from '@nestjs/testing';
import { $Enums } from '../../generated/prisma';
import { DeliveryStatusUpdateProcessor } from './delivery-status-update.processor';
import { DeliveryCommandTrackingService } from './delivery-command-tracking.service';
import { DeliveriesService } from '../../deliveries/deliveries.service';
import { VENDEDOR_PROFILE_RESOLVER_PORT } from '../../deliveries/vendedor-profile-resolver.port';
import { DeliveryJobStatus } from '@agua/contracts';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DeliveryStatusUpdateProcessor', () => {
  let processor: DeliveryStatusUpdateProcessor;
  let mockTracking: jest.Mocked<DeliveryCommandTrackingService>;
  let mockDeliveriesService: jest.Mocked<DeliveriesService>;
  let mockVendedorResolver: jest.Mocked<{ resolveVendedorIdByAuthUserId: jest.Mock }>;

  const defaultJobData = {
    jobId: 'deliveries.update_status:del-1:key-1',
    trackingId: 'tracking-uuid-1',
    deliveryId: 'del-1',
    vendedorId: 'vendedor-1',
    actorUserId: 'auth-user-1',
    idempotencyKey: 'key-1',
    estado: $Enums.DeliveryEstado.en_camino,
    notas: null as string | null,
    requestId: 'req-1',
    requestedAt: '2026-07-22T12:00:00.000Z',
  };

  const pendingRecord = {
    id: 'job-record-id',
    trackingId: 'tracking-uuid-1',
    jobId: 'deliveries.update_status:del-1:key-1',
    deliveryId: 'del-1',
    vendedorId: 'vendedor-1',
    actorUserId: 'auth-user-1',
    estado: $Enums.DeliveryEstado.en_camino as $Enums.DeliveryEstado,
    notas: null as string | null,
    estadoAnterior: null as $Enums.DeliveryEstado | null,
    status: $Enums.DeliveryJobStatus.PENDING,
    idempotencyKey: 'key-1',
    payloadFingerprint: 'abc123',
    errorCode: null as string | null,
    errorMessage: null as string | null,
    attempts: 0,
    createdAt: new Date('2026-07-22'),
    updatedAt: new Date('2026-07-22'),
  };

  beforeEach(async () => {
    mockTracking = {
      registerPending: jest.fn(),
      transitionStatus: jest.fn(),
      findByTrackingId: jest.fn(),
    } as unknown as jest.Mocked<DeliveryCommandTrackingService>;

    mockDeliveriesService = {
      updateStatus: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<DeliveriesService>;

    mockVendedorResolver = {
      resolveVendedorIdByAuthUserId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryStatusUpdateProcessor,
        { provide: DeliveryCommandTrackingService, useValue: mockTracking },
        { provide: DeliveriesService, useValue: mockDeliveriesService },
        { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useValue: mockVendedorResolver },
      ],
    }).compile();

    processor = moduleRef.get(DeliveryStatusUpdateProcessor);
  });

  describe('process', () => {
    it('happy path: PENDING → PROCESSING → COMPLETED', async () => {
      const processingRecord = { ...pendingRecord, status: $Enums.DeliveryJobStatus.PROCESSING };
      const completedRecord = {
        ...pendingRecord,
        status: $Enums.DeliveryJobStatus.COMPLETED,
        estadoAnterior: $Enums.DeliveryEstado.pendiente,
      };

      mockTracking.registerPending.mockResolvedValue(pendingRecord);
      mockTracking.transitionStatus
        .mockResolvedValueOnce(processingRecord)   // PENDING→PROCESSING
        .mockResolvedValueOnce(completedRecord);   // PROCESSING→COMPLETED

      mockDeliveriesService.updateStatus.mockResolvedValue({} as never);

      const result = await processor.process(defaultJobData);

      expect(mockTracking.registerPending).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryId: 'del-1', idempotencyKey: 'key-1' }),
      );
      expect(mockTracking.transitionStatus).toHaveBeenNthCalledWith(
        1,
        'job-record-id',
        $Enums.DeliveryJobStatus.PENDING,
        $Enums.DeliveryJobStatus.PROCESSING,
      );
      expect(mockDeliveriesService.updateStatus).toHaveBeenCalledWith('del-1', {
        estado: $Enums.DeliveryEstado.en_camino,
        notas: undefined,
      }, 'vendedor-1', 'auth-user-1');
      expect(mockTracking.transitionStatus).toHaveBeenNthCalledWith(
        2,
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.COMPLETED,
      );
      expect(result.status).toBe(DeliveryJobStatus.COMPLETED);
    });

    function makeFailedRecord(fields: Partial<typeof pendingRecord> = {}) {
      return { ...pendingRecord, status: $Enums.DeliveryJobStatus.FAILED, ...fields };
    }

    function makeProcessingRecord() {
      return { ...pendingRecord, status: $Enums.DeliveryJobStatus.PROCESSING };
    }

    it('handles delivery not found as non-retryable failure', async () => {
      mockTracking.registerPending.mockResolvedValue(pendingRecord);
      mockTracking.transitionStatus
        .mockResolvedValueOnce(makeProcessingRecord())
        .mockResolvedValueOnce(makeFailedRecord());

      mockDeliveriesService.updateStatus.mockRejectedValue(
        new NotFoundException('Entrega del-1 no encontrada'),
      );

      const result = await processor.process(defaultJobData);

      expect(mockTracking.transitionStatus).toHaveBeenNthCalledWith(
        2,
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.FAILED,
        expect.objectContaining({ errorCode: 'DELIVERY_NOT_FOUND' }),
      );
      expect(result.status).toBe(DeliveryJobStatus.FAILED);
    });

    it('handles invalid transition as non-retryable failure', async () => {
      mockTracking.registerPending.mockResolvedValue(pendingRecord);
      mockTracking.transitionStatus
        .mockResolvedValueOnce(makeProcessingRecord())
        .mockResolvedValueOnce(makeFailedRecord());

      mockDeliveriesService.updateStatus.mockRejectedValue(
        new BadRequestException("Transición de estado inválida"),
      );

      const result = await processor.process(defaultJobData);

      expect(mockTracking.transitionStatus).toHaveBeenNthCalledWith(
        2,
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.FAILED,
        expect.objectContaining({ errorCode: 'BAD_REQUEST' }),
      );
      expect(result.status).toBe(DeliveryJobStatus.FAILED);
    });

    it('handles retryable errors (network/db) when attempts remain', async () => {
      mockTracking.registerPending.mockResolvedValue(pendingRecord);
      mockTracking.transitionStatus
        .mockResolvedValueOnce(makeProcessingRecord())
        .mockResolvedValueOnce({ ...pendingRecord, status: $Enums.DeliveryJobStatus.RETRYING, attempts: 1 });

      mockDeliveriesService.updateStatus.mockRejectedValue(
        new Error('Database connection timeout'),
      );

      const result = await processor.process(defaultJobData);

      expect(mockTracking.transitionStatus).toHaveBeenNthCalledWith(
        2,
        'job-record-id',
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.RETRYING,
        expect.objectContaining({ errorMessage: 'Database connection timeout' }),
      );
      expect(result.status).toBe(DeliveryJobStatus.RETRYING);
    });

    it('handles duplicate idempotency key by returning existing result', async () => {
      // Simulate what DeliveryCommandTrackingService.registerPending does:
      // catches P2002 from Prisma and throws 'DUPLICATE_KEY'
      mockTracking.registerPending.mockRejectedValue(new Error('DUPLICATE_KEY'));

      const existingCompleted = { ...pendingRecord, status: $Enums.DeliveryJobStatus.COMPLETED };
      mockTracking.findByTrackingId.mockResolvedValue(existingCompleted);

      const result = await processor.process(defaultJobData);

      expect(mockTracking.findByTrackingId).toHaveBeenCalledWith('tracking-uuid-1');
      expect(result.status).toBe(DeliveryJobStatus.COMPLETED);
      expect(mockDeliveriesService.updateStatus).not.toHaveBeenCalled();
    });

    it('re-throws when duplicate key found but no existing tracking record', async () => {
      mockTracking.registerPending.mockRejectedValue(new Error('DUPLICATE_KEY'));
      mockTracking.findByTrackingId.mockResolvedValue(null);

      await expect(processor.process(defaultJobData)).rejects.toThrow('DUPLICATE_KEY');
    });
  });
});
