import { DeliveryJobStatus } from '@agua/contracts';
import { classifyDeliveryJobFailure } from './delivery-failure-classifier';

describe('delivery-failure-classifier', () => {
  describe('classifyDeliveryJobFailure', () => {
    it('classifies 4xx business errors as terminal (FAILED)', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('Transición de estado inválida'),
        errorCode: 'BAD_REQUEST',
        attempts: 0,
        maxAttempts: 3,
      });

      expect(result.status).toBe(DeliveryJobStatus.FAILED);
      expect(result.errorCode).toBe('BAD_REQUEST');
    });

    it('classifies "delivery not found" errors as terminal (FAILED)', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('Delivery no encontrado'),
        errorCode: 'DELIVERY_NOT_FOUND',
        attempts: 0,
        maxAttempts: 3,
      });

      expect(result.status).toBe(DeliveryJobStatus.FAILED);
      expect(result.errorCode).toBe('DELIVERY_NOT_FOUND');
    });

    it('classifies 5xx errors as retryable (RETRYING) when attempts remain', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('Database connection timeout'),
        errorCode: 'INTERNAL_ERROR',
        attempts: 1,
        maxAttempts: 3,
      });

      expect(result.status).toBe(DeliveryJobStatus.RETRYING);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('classifies network/timeout errors as retryable (RETRYING) when attempts remain', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('socket hang up'),
        errorCode: 'NETWORK_ERROR',
        attempts: 0,
        maxAttempts: 3,
      });

      expect(result.status).toBe(DeliveryJobStatus.RETRYING);
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('classifies retries exhausted as dead-letter (DEAD_LETTER)', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('Database connection timeout'),
        errorCode: 'INTERNAL_ERROR',
        attempts: 3,
        maxAttempts: 3,
      });

      expect(result.status).toBe(DeliveryJobStatus.DEAD_LETTER);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('classifies retries exhausted even for terminal-like errors as dead-letter', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('Delivery no encontrado'),
        errorCode: 'DELIVERY_NOT_FOUND',
        attempts: 3,
        maxAttempts: 3,
      });

      expect(result.status).toBe(DeliveryJobStatus.DEAD_LETTER);
    });

    it('includes error message in result', () => {
      const result = classifyDeliveryJobFailure({
        error: new Error('Algo salió mal'),
        errorCode: 'UNKNOWN',
        attempts: 0,
        maxAttempts: 3,
      });

      expect(result.errorMessage).toBe('Algo salió mal');
    });
  });
});
