import { DestroyRef, InjectionToken, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MetodoPago } from '@agua/contracts';
import type {
  AsyncAcceptedResponse,
  CreateOrderV2Request,
  DireccionEntrega,
} from '@agua/contracts';
import {
  ClientePedidoFailure,
  classifyOrderCreateFailure,
} from './cliente-pedido-error';
import type { ClientePedidoDraft } from './cliente-pedido-draft.contract';
import { CLIENTE_PEDIDO_GATEWAY } from './cliente-pedido.gateway';
import { CLIENTE_PROVIDER_READER } from './cliente-provider.store';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_TRACKING_WRITER } from './cliente-tracking.contract';

/** Generates the idempotency key for one confirmation intent. */
export const CLIENTE_IDEMPOTENCY_KEY_FACTORY = new InjectionToken<() => string>(
  'CLIENTE_IDEMPOTENCY_KEY_FACTORY',
  { providedIn: 'root', factory: () => () => crypto.randomUUID() },
);

/**
 * Coordinates order confirmation: validates that the displayed cart still
 * belongs to the stored provider, builds the provider-scoped request, and
 * owns the idempotency key lifecycle.
 *
 * `cartVendedorId` is the provider of the cart the cliente is looking at.
 * Submitting the *current* stored provider instead would let a provider
 * change underneath the screen create the order against a cart the user
 * never reviewed.
 *
 * The key belongs to a confirmation intent: retrying an unchanged payload
 * reuses it, while editing any field or a successful acceptance issues a new
 * one. That keeps a double submit from creating two orders without blocking a
 * genuinely new attempt. Idempotency conflicts are resolved by the order
 * worker and surface through the job status, so they never clear the key.
 */
@Injectable()
export class ClientePedidoFacade {
  private readonly gateway = inject(CLIENTE_PEDIDO_GATEWAY);
  private readonly providerStore = inject(CLIENTE_PROVIDER_READER);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly trackingWriter = inject(CLIENTE_TRACKING_WRITER);
  private readonly newKey = inject(CLIENTE_IDEMPOTENCY_KEY_FACTORY);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly accepted = signal<AsyncAcceptedResponse | null>(null);
  readonly feedback = signal<ClientePedidoFailure | null>(null);
  readonly redirectToHome = signal(false);

  private pendingKey: string | null = null;
  private pendingFingerprint: string | null = null;
  private requestId = 0;

  constructor() {
    this.session.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.requestId++;
        this.submitting.set(false);
        this.accepted.set(null);
        this.feedback.set(null);
        this.pendingKey = null;
        this.pendingFingerprint = null;
      });
  }

  submit(draft: ClientePedidoDraft, cartVendedorId: string): void {
    if (this.submitting()) {
      return;
    }

    const userId = this.session.currentSession?.user.id ?? null;
    const storedVendedorId = userId === null ? null : this.providerStore.read(userId);
    if (userId === null || storedVendedorId === null || storedVendedorId.length === 0) {
      this.redirectToHome.set(true);
      return;
    }

    // The selection changed after the cart was loaded: the visible cart no
    // longer belongs to the stored provider, so leave the screen.
    if (storedVendedorId !== cartVendedorId) {
      this.redirectToHome.set(true);
      return;
    }

    const request = buildRequest(draft, cartVendedorId);
    const fingerprint = JSON.stringify(request);
    if (this.pendingKey === null || this.pendingFingerprint !== fingerprint) {
      this.pendingKey = this.newKey();
      this.pendingFingerprint = fingerprint;
    }

    const requestId = ++this.requestId;
    this.submitting.set(true);
    this.feedback.set(null);
    this.accepted.set(null);

    this.gateway
      .createOrder(request, this.pendingKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (accepted) => {
          if (requestId !== this.requestId || !this.isCurrentUser(userId)) {
            return;
          }
          this.submitting.set(false);
          this.accepted.set(accepted);
          // The orders list does not expose trackingId: persist it for the
          // orders page. `add` is idempotent, so a replayed acceptance is safe.
          this.trackingWriter.add(accepted.trackingId);
          // The intent completed: the next order must use a fresh key.
          this.pendingKey = null;
          this.pendingFingerprint = null;
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId || !this.isCurrentUser(userId)) {
            return;
          }
          this.handleError(error, userId);
        },
      });
  }

  private handleError(error: unknown, userId: string): void {
    this.submitting.set(false);
    const failure = classifyOrderCreateFailure(error);

    if (failure === ClientePedidoFailure.ProviderLost) {
      this.providerStore.clear(userId);
      this.resetPendingIntent();
      this.redirectToHome.set(true);
      return;
    }

    this.feedback.set(failure);
  }

  private resetPendingIntent(): void {
    this.pendingKey = null;
    this.pendingFingerprint = null;
  }

  private isCurrentUser(userId: string): boolean {
    return this.session.currentSession?.user.id === userId;
  }
}

function buildRequest(draft: ClientePedidoDraft, vendedorId: string): CreateOrderV2Request {
  const request: CreateOrderV2Request = {
    vendedorId,
    metodoPago: MetodoPago.CONTRA_ENTREGA,
    direccion: buildDireccion(draft),
  };

  const observaciones = draft.observaciones?.trim();
  if (observaciones !== undefined && observaciones.length > 0) {
    request.observaciones = observaciones;
  }

  return request;
}

function buildDireccion(draft: ClientePedidoDraft): DireccionEntrega {
  const direccion: DireccionEntrega = {
    calle: draft.calle.trim(),
    numero: draft.numero.trim(),
  };

  assignIfPresent(direccion, 'pisoDepto', draft.pisoDepto);
  assignIfPresent(direccion, 'referencia', draft.referencia);
  assignIfPresent(direccion, 'barrio', draft.barrio);
  assignIfPresent(direccion, 'ciudad', draft.ciudad);
  assignIfPresent(direccion, 'provincia', draft.provincia);
  assignIfPresent(direccion, 'codigoPostal', draft.codigoPostal);

  return direccion;
}

function assignIfPresent(
  direccion: DireccionEntrega,
  field: 'pisoDepto' | 'referencia' | 'barrio' | 'ciudad' | 'provincia' | 'codigoPostal',
  value: string | undefined,
): void {
  const trimmed = value?.trim();
  if (trimmed !== undefined && trimmed.length > 0) {
    direccion[field] = trimmed;
  }
}
