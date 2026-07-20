const DEFAULT_TCP_PORT = 3016;
const MAX_TCP_PORT = 65535;
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/agua_notifications';

export function getTcpPort(value: string | undefined = process.env.TCP_PORT): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_TCP_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > MAX_TCP_PORT) {
    throw new Error('TCP_PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function getMongoUri(value: string | undefined = process.env.MONGODB_URI): string {
  if (value === undefined) {
    return DEFAULT_MONGODB_URI;
  }
  if (value.trim() === '') {
    throw new Error('MONGODB_URI is required');
  }

  return value;
}
