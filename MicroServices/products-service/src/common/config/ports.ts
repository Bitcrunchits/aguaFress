export function getTcpPort(): number {
  return parseInt(process.env.TCP_PORT ?? '', 10) || 3013;
}
