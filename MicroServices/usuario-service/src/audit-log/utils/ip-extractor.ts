export function extractIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const first = raw.split(',')[0]?.trim();
    if (first) return first;
  }
  // req.ip may be a string or undefined in some edge cases
  return req.ip ?? null;
}
