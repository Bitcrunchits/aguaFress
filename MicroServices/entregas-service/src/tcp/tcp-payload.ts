export interface TcpAuthenticatedUser {
 readonly sub?: string;
 readonly userId?: string;
 readonly email: string;
 readonly role: string;
}
export interface TcpPayload {
  readonly body?: unknown;
  readonly query?: Record<string, string>;
  readonly params?: Record<string, string>;
  readonly user?: TcpAuthenticatedUser;
  readonly requestId: string;
}