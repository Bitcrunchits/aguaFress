import axios from 'axios';
import type { ErrorResponse } from '@agua/contracts';

export interface DisplayApiError {
  message: string;
  statusCode?: number;
}

function getMessageFromResponse(data: ErrorResponse | string | undefined): string | undefined {
  if (!data) return undefined;
  if (typeof data === 'string') return data;
  return data.message || data.error;
}

export function normalizeApiError(error: unknown, fallback = 'No se pudo completar la solicitud'): DisplayApiError {
  if (axios.isAxiosError<ErrorResponse | string>(error)) {
    const message = getMessageFromResponse(error.response?.data) ?? error.message ?? fallback;
    return {
      message,
      statusCode: error.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: fallback };
}
