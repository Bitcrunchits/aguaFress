export interface NumberReadResult {
  readonly value: number;
  readonly error: string | null;
}

export function readOptionalPositiveInteger(
  rawValue: string | undefined,
  fallbackValue: number,
  envKey: string,
): NumberReadResult {
  if (!rawValue || rawValue.trim().length === 0) {
    return { value: fallbackValue, error: null };
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return { value: fallbackValue, error: `${envKey} must be a positive integer` };
  }

  return { value: parsedValue, error: null };
}