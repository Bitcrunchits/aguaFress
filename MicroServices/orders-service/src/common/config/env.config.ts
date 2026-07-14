const DEFAULT_TCP_PORT = 3014;
const MAX_TCP_PORT = 65535;

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
