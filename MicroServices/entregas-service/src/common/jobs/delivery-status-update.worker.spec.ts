import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeliveryStatusUpdateWorker } from './delivery-status-update.worker';
import { DeliveryStatusUpdateProcessor } from './delivery-status-update.processor';
import { DeliveryCommandTrackingService } from './delivery-command-tracking.service';
import { DELIVERY_REPOSITORY } from '../../deliveries/deliveries.repository';

describe('DeliveryStatusUpdateWorker', () => {
  let worker: DeliveryStatusUpdateWorker;
  let mockProcessor: jest.Mocked<DeliveryStatusUpdateProcessor>;
  let mockTracking: jest.Mocked<DeliveryCommandTrackingService>;

  beforeEach(async () => {
    mockProcessor = {
      process: jest.fn(),
    } as unknown as jest.Mocked<DeliveryStatusUpdateProcessor>;

    mockTracking = {
      registerPending: jest.fn(),
      transitionStatus: jest.fn(),
      findByTrackingId: jest.fn(),
    } as unknown as jest.Mocked<DeliveryCommandTrackingService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryStatusUpdateWorker,
        { provide: DeliveryStatusUpdateProcessor, useValue: mockProcessor },
        { provide: DeliveryCommandTrackingService, useValue: mockTracking },
        {
          provide: DELIVERY_REPOSITORY,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            updateStatus: jest.fn(),
            createDeliveryCommandJob: jest.fn(),
            findDeliveryCommandByIdempotency: jest.fn(),
            findDeliveryCommandByTrackingId: jest.fn(),
            updateDeliveryCommandJobStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    worker = moduleRef.get(DeliveryStatusUpdateWorker);
  });

  describe('worker setup', () => {
    it('is defined', () => {
      expect(worker).toBeDefined();
    });

    it('has onModuleInit and onModuleDestroy lifecycle hooks', () => {
      expect(typeof worker.onModuleInit).toBe('function');
      expect(typeof worker.onModuleDestroy).toBe('function');
    });
  });

  describe('processJob', () => {
    it('processes a job successfully', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          jobId: 'deliveries.update_status:del-1:key-1',
          trackingId: 'tracking-uuid-1',
          deliveryId: 'del-1',
        },
        attemptsMade: 1,
      };

      mockProcessor.process.mockResolvedValue({ status: 'COMPLETED' } as never);

      const result = await worker.processJob(mockJob as never);

      expect(mockProcessor.process).toHaveBeenCalledWith(mockJob.data);
      expect(result).toEqual({ status: 'COMPLETED' });
    });

    it('logs and re-throws on processor failure', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          jobId: 'deliveries.update_status:del-1:key-1',
          trackingId: 'tracking-uuid-1',
        },
        attemptsMade: 1,
      };

      const processorError = new Error('Processing failed');
      mockProcessor.process.mockRejectedValue(processorError);

      await expect(worker.processJob(mockJob as never)).rejects.toThrow('Processing failed');
    });
  });
});
