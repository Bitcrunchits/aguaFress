import { UserRole } from '@agua/contracts';

export interface TcpAuthenticatedUser {
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface TcpPayload {
  readonly body?: unknown;
  readonly query?: Record<string, string>;
  readonly params?: Record<string, string>;
  readonly user?: unknown;
  readonly requestId?: string;
}
