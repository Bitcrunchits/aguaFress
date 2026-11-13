/**
 * Builds the frontend route path for a public invitation link. The token is
 * URL-encoded so it survives being embedded in an anchor or a QR code.
 */
export function buildInvitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}

/**
 * Builds the absolute invitation URL for a token. The backend's
 * `link-invitacion.vendor/create` returns a hardcoded `linkUrl`
 * (`https://agua.app/invitar/{token}`) that does NOT match the real domain,
 * so the frontend never trusts it and reconstructs the URL from the app
 * origin instead.
 */
export function buildInviteUrl(token: string, origin: string): string {
  return `${origin}${buildInvitePath(token)}`;
}
