import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderJobStatus } from '@agua/contracts';
import type { BaseEvent, OrderJobStatusResponse } from '@agua/contracts';
import {
  Subject,
  Subscription,
  catchError,
  concatMap,
  map,
  of,
  take,
  timer,
} from 'rxjs';
import type { Observable } from 'rxjs';
import { CLIENTE_PEDIDOS_TRACKING_GATEWAY } from './cliente-pedidos.gateway';
import { CLIENTE_TRACKING_READER } from './cliente-tracking.contract';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;
const INITIAL_NOT_FOUND_GRACE_ATTEMPTS = 3;

/** Typed tracking failures that do not come from an `OrderJobStatusResponse`. */
export enum ClientePedidosTrackingError {
  NotFound = 'tracking-not-found',
}

export interface ClientePedidoTrackingView {
  readonly trackingId: string;
  readonly status: OrderJobStatus;
  readonly attempts: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly terminal: boolean;
}

enum ClientePollEventType {
  Status = 'Status',
  Failure = 'Failure',
}

interface ClientePollStatusEvent extends BaseEvent {
  readonly type: ClientePollEventType.Status;
  readonly response: OrderJobStatusResponse;
  readonly attempt: number;
}

interface ClientePollFailureEvent extends BaseEvent {
  readonly type: ClientePollEventType.Failure;
  readonly error: unknown;
  readonly attempt: number;
}

type PollEvent = ClientePollStatusEvent | ClientePollFailureEvent;

interface PollingState {
  hasReceivedStatus: boolean;
  initialNotFoundCount: number;
}

/**
 * Coordinates polling for pending async order trackings.
 *
 * The list response does not expose `trackingId`, so pending ids come from
 * `ClienteTrackingReader`. Polling is bounded: one timer per tracking id, a
 * fixed interval, and a hard attempt cap. Terminal statuses stop immediately.
 * Before the first status response, the first three consecutive 404s are
 * transient because the gateway accepts the order before the worker registers
 * the job row; after a status response, 404s stay transient until the cap.
 * Every request and timer is bound to the facade lifecycle and cancelled on
 * session replacement.
 *
 * Pending ids are keyed by the validated auth user id. On readiness, a
 * different id starts from the incoming user's key and only resets the
 * in-memory view; the previous user's persisted ids are left untouched.
 *
 * Only COMPLETED clears the id automatically. Failed and not-found terminal
 * cards stay persisted until the user dismisses them. A new polling session
 * resets a persisted terminal card to PENDING before the first request.
 *
 * A completed tracking emits `completed$`; the orders page owns the list and
 * decides when to reload it. This facade never depends on the list facade.
 */
@Injectable()
export class ClientePedidosTrackingFacade {
  private readonly gateway = inject(CLIENTE_PEDIDOS_TRACKING_GATEWAY);
  private readonly trackingReader = inject(CLIENTE_TRACKING_READER);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly sessionReadiness = inject(CLIENTE_SESSION_READINESS_READER);
  private readonly destroyRef = inject(DestroyRef);

  readonly trackings = signal<ClientePedidoTrackingView[]>([]);

  private readonly completedSubject = new Subject<void>();
  readonly completed$: Observable<void> = this.completedSubject.asObservable();

  private sessionGeneration = 0;
  private isSessionReady = false;
  private trackingRequested = false;
  /** Last user id confirmed by readiness; null until the first validation. */
  private validatedUserId: string | null = null;
  private readonly pollingSubscriptions = new Map<string, Subscription>();

  constructor() {
    this.session.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Wait for readiness: the incoming identity is not trusted yet, so the
        // persisted ids stay untouched until reconciliation runs.
        this.isSessionReady = false;
        this.invalidateSessionWork();
      });

    this.sessionReadiness.sessionReady$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ready) => {
        if (!ready) {
          this.isSessionReady = false;
          this.resetForSessionChange();
          return;
        }
        this.isSessionReady = true;
        this.reconcileIdentity();
        if (this.trackingRequested) {
          this.trackPending();
        }
      });

    this.destroyRef.onDestroy(() => this.completedSubject.complete());
  }

  trackPending(): void {
    this.trackingRequested = true;
    if (!this.isSessionReady) {
      return;
    }

    const pendingIds = this.trackingReader.list();

    for (const [trackingId, subscription] of [...this.pollingSubscriptions]) {
      if (!pendingIds.includes(trackingId)) {
        subscription.unsubscribe();
        this.pollingSubscriptions.delete(trackingId);
      }
    }

    for (const trackingId of pendingIds) {
      this.ensureTracking(trackingId);
      if (!this.pollingSubscriptions.has(trackingId)) {
        this.startPolling(trackingId);
      }
    }
  }

  private startPolling(trackingId: string): void {
    if (this.pollingSubscriptions.has(trackingId)) {
      return;
    }

    this.resetTrackingForPolling(trackingId);

    const generation = this.sessionGeneration;
    const state: PollingState = {
      hasReceivedStatus: false,
      initialNotFoundCount: 0,
    };
    let attempts = 0;

    const subscription = timer(0, POLL_INTERVAL_MS)
      .pipe(
        take(MAX_POLL_ATTEMPTS),
        concatMap(() => {
          attempts++;
          const attempt = attempts;
          return this.gateway.getJobStatus(trackingId).pipe(
            map(
              (response): PollEvent => ({
                type: ClientePollEventType.Status,
                response,
                attempt,
                timestamp: new Date().toISOString(),
              }),
            ),
            catchError((error: unknown) =>
              of<PollEvent>({
                type: ClientePollEventType.Failure,
                error,
                attempt,
                timestamp: new Date().toISOString(),
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event) => this.handlePollEvent(trackingId, event, generation, state),
        complete: () => {
          // A cap-exhausted tracking keeps its id so a later reload can resume.
          if (this.pollingSubscriptions.get(trackingId) === subscription) {
            this.pollingSubscriptions.delete(trackingId);
          }
        },
      });

    this.pollingSubscriptions.set(trackingId, subscription);
  }

  private handlePollEvent(
    trackingId: string,
    event: PollEvent,
    generation: number,
    state: PollingState,
  ): void {
    if (generation !== this.sessionGeneration) {
      return;
    }

    if (event.type === ClientePollEventType.Failure) {
      this.handlePollFailure(trackingId, event.error, event.attempt, state);
      return;
    }

    state.hasReceivedStatus = true;
    state.initialNotFoundCount = 0;

    this.patchTracking(trackingId, {
      status: event.response.status,
      attempts: event.attempt,
      errorCode: event.response.errorCode,
      errorMessage: event.response.errorMessage,
    });

    if (event.response.status === OrderJobStatus.COMPLETED) {
      this.settleTracking(trackingId);
      this.trackingReader.remove(trackingId);
      this.completedSubject.next();
      return;
    }

    if (
      event.response.status === OrderJobStatus.FAILED ||
      event.response.status === OrderJobStatus.DEAD_LETTER
    ) {
      this.settleTracking(trackingId);
    }
  }

  private handlePollFailure(
    trackingId: string,
    error: unknown,
    attempt: number,
    state: PollingState,
  ): void {
    const isNotFound = error instanceof HttpErrorResponse && error.status === 404;

    if (state.hasReceivedStatus) {
      this.patchTracking(trackingId, { attempts: attempt });
      return;
    }

    if (!isNotFound) {
      state.initialNotFoundCount = 0;
      this.patchTracking(trackingId, { attempts: attempt });
      return;
    }

    state.initialNotFoundCount++;
    if (state.initialNotFoundCount <= INITIAL_NOT_FOUND_GRACE_ATTEMPTS) {
      this.patchTracking(trackingId, { attempts: attempt });
      return;
    }

    this.settleTracking(trackingId, {
      attempts: attempt,
      errorCode: ClientePedidosTrackingError.NotFound,
    });
  }

  dismiss(trackingId: string): void {
    this.stopPolling(trackingId);
    this.trackingReader.remove(trackingId);
    this.trackings.update((views) =>
      views.filter((view) => view.trackingId !== trackingId),
    );
  }

  /** Stops the timer and keeps the final status visible as a terminal card. */
  private settleTracking(
    trackingId: string,
    patch: Partial<ClientePedidoTrackingView> = {},
  ): void {
    this.stopPolling(trackingId);
    this.patchTracking(trackingId, { ...patch, terminal: true });
  }

  private stopPolling(trackingId: string): void {
    const subscription = this.pollingSubscriptions.get(trackingId);
    if (subscription !== undefined) {
      subscription.unsubscribe();
      this.pollingSubscriptions.delete(trackingId);
    }
  }

  private stopAllPolling(): void {
    for (const subscription of this.pollingSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.pollingSubscriptions.clear();
  }

  /**
   * Reconciles the incoming session against the last validated user id. Email
   * is not a verified identity, so id equality is the only signal that the
   * pending ids belong to the same user. A different id resets only the
   * in-memory view and leaves the previous user's key isolated.
   */
  private reconcileIdentity(): void {
    const incomingUserId = this.session.currentSession?.user.id ?? null;

    if (this.validatedUserId !== null && this.validatedUserId !== incomingUserId) {
      this.resetForSessionChange();
    }

    this.validatedUserId = incomingUserId;
  }

  /** Invalidates in-flight work but keeps the visible view for reconciliation. */
  private invalidateSessionWork(): void {
    this.sessionGeneration++;
    this.stopAllPolling();
  }

  /** Discards the previous session view without touching persisted ids. */
  private resetForSessionChange(): void {
    this.invalidateSessionWork();
    this.trackings.set([]);
  }

  /** Resets a persisted terminal card before a fresh polling session. */
  private resetTrackingForPolling(trackingId: string): void {
    this.trackings.update((views) =>
      views.map((view) =>
        view.trackingId === trackingId
          ? {
              trackingId,
              status: OrderJobStatus.PENDING,
              attempts: 0,
              terminal: false,
            }
          : view,
      ),
    );
  }

  private ensureTracking(trackingId: string): void {
    this.trackings.update((views) => {
      if (views.some((view) => view.trackingId === trackingId)) {
        return views;
      }
      return [
        ...views,
        {
          trackingId,
          status: OrderJobStatus.PENDING,
          attempts: 0,
          terminal: false,
        },
      ];
    });
  }

  private patchTracking(
    trackingId: string,
    patch: Partial<ClientePedidoTrackingView>,
  ): void {
    this.trackings.update((views) =>
      views.map((view) =>
        view.trackingId === trackingId ? { ...view, ...patch } : view,
      ),
    );
  }
}
