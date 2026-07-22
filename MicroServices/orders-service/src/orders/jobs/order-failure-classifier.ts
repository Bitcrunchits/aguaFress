import { HttpException } from '@nestjs/common';

const ERROR_CODES = {
  RETRYABLE_SERVICE_UNAVAILABLE: 'RETRYABLE_SERVICE_UNAVAILABLE',
  DEAD_LETTER_SERVICE_UNAVAILABLE: 'DEAD_LETTER_SERVICE_UNAVAILABLE',
  TERMINAL_BAD_REQUEST: 'TERMINAL_BAD_REQUEST',
  TERMINAL_FORBIDDEN: 'TERMINAL_FORBIDDEN',
  TERMINAL_CONFLICT: 'TERMINAL_CONFLICT',
  TERMINAL_UNKNOWN: 'TERMINAL_UNKNOWN',
} as const;

export interface OrderJobFailureAttemptContext {
  readonly currentAttempt: number;
  readonly maxAttempts: number;
}

export interface OrderJobFailureClassification {
  readonly retryable: boolean;
  readonly exhausted: boolean;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export function classifyOrderJobFailure(error: unknown, context: OrderJobFailureAttemptContext): OrderJobFailureClassification {
  const status = readHttpStatus(error);
  const retryable = status === undefined || status >= 500;
  const exhausted = retryable && context.currentAttempt >= context.maxAttempts;

  return {
    retryable,
    exhausted,
    errorCode: resolveErrorCode(status, retryable, exhausted),
    errorMessage: readErrorMessage(error),
  };
}

function resolveErrorCode(status: number | undefined, retryable: boolean, exhausted: boolean): string {
  if (retryable) {
    return exhausted ? ERROR_CODES.DEAD_LETTER_SERVICE_UNAVAILABLE : ERROR_CODES.RETRYABLE_SERVICE_UNAVAILABLE;
  }

  if (status === 400) return ERROR_CODES.TERMINAL_BAD_REQUEST;
  if (status === 403) return ERROR_CODES.TERMINAL_FORBIDDEN;
  if (status === 409) return ERROR_CODES.TERMINAL_CONFLICT;
  return ERROR_CODES.TERMINAL_UNKNOWN;
}

function readHttpStatus(error: unknown): number | undefined {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  return undefined;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return 'Order job failed';
}
