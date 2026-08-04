import { DeliveryJobStatus } from '@agua/contracts';

export interface ClassifyDeliveryJobFailureInput {
  readonly error: Error;
  readonly errorCode: string;
  readonly attempts: number;
  readonly maxAttempts: number;
}

export interface ClassifyDeliveryJobFailureResult {
  readonly status: DeliveryJobStatus.FAILED | DeliveryJobStatus.RETRYING | DeliveryJobStatus.DEAD_LETTER;
  readonly errorCode: string;
  readonly errorMessage: string;
}

/**
 * Classify a delivery job failure into the appropriate terminal/retry/dead-letter status.
 *
 * - If retries exhausted (attempts >= maxAttempts) → DEAD_LETTER
 * - If error is business/validation (BadRequest, NotFound, Forbidden) → FAILED
 * - Otherwise (network, db timeout, 5xx) → RETRYING
 */
export function classifyDeliveryJobFailure(input: ClassifyDeliveryJobFailureInput): ClassifyDeliveryJobFailureResult {
  const { error, errorCode, attempts, maxAttempts } = input;
  const errorMessage = error.message;

  if (attempts >= maxAttempts) {
    return { status: DeliveryJobStatus.DEAD_LETTER, errorCode, errorMessage };
  }

  // Business errors are terminal — no point retrying
  const terminalErrorCodes = new Set([
    'BAD_REQUEST',
    'DELIVERY_NOT_FOUND',
    'FORBIDDEN',
    'PAYLOAD_CONFLICT',
    'INVALID_TRANSITION',
  ]);

  if (terminalErrorCodes.has(errorCode)) {
    return { status: DeliveryJobStatus.FAILED, errorCode, errorMessage };
  }

  // Everything else is retryable (network, db timeout, 5xx)
  return { status: DeliveryJobStatus.RETRYING, errorCode, errorMessage };
}
