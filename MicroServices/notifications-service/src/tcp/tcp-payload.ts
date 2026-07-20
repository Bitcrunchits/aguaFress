import { UserRole } from '@agua/contracts';

export interface TcpAuthenticatedUser {
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface TcpPayload {
  readonly body?: unknown;
  readonly query?: Record<string, unknown>;
  readonly params?: Record<string, unknown>;
  readonly user?: unknown;
  readonly requestId?: string;
}
