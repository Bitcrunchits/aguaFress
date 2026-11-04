import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { OrderJobStatus, UserRole } from '@agua/contracts';
import type { LoginResponse, OrderJobStatusResponse } from '@agua/contracts';
import { BehaviorSubject, EMPTY, Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import {
  ClientePedidosTrackingError,
  ClientePedidosTrackingFacade,
} from './cliente-pedidos-tracking.facade';
import { CLIENTE_PEDIDOS_TRACKING_GATEWAY } from './cliente-pedidos.gateway';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';
import { CLIENTE_TRACKING_READER } from './cliente-tracking.contract';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

const SESSION: LoginResponse = {
  token: 'token',
  refreshToken: 'refresh-token',
  user: { id: 'user-1', email: 'cliente@example.com', role: UserRole.CLIENTE },
};

const SESSION_SAME_ID_NEW_EMAIL: LoginResponse = {
  ...SESSION,
  user: { ...SESSION.user, email: 'corrected@example.com' },
};

const SESSION_OTHER_USER: LoginResponse = {
  ...SESSION,
  user: { ...SESSION.user, id: 'user-3', email: 'other@example.com' },
};

const JOB_STATUS: OrderJobStatusResponse = {
  clienteId: 'cliente-profile-1',
  idempotencyKey: 'key-1',
  jobId: 'job-1',
  trackingId: 'tracking-1',
  vendedorId: 'vendedor-1',
  status: OrderJobStatus.PROCESSING,
  attempts: 1,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:05.000Z',
};

function jobStatus(
  status: OrderJobStatus,
  overrides: Partial<OrderJobStatusResponse> = {},
): OrderJobStatusResponse {
  return { ...JOB_STATUS, status, ...overrides };
}

@Component({ template: '', providers: [ClientePedidosTrackingFacade] })
class TrackingFacadeHost {}

describe('ClientePedidosTrackingFacade', () => {
  const gatewayStub = {
    getJobStatus: jasmine.createSpy('getJobStatus'),
  };
  const trackingReaderStub = {
    list: jasmine.createSpy('list'),
    remove: jasmine.createSpy('remove'),
  };
  const sessionStub: {
    currentSession: LoginResponse | null;
    sessionReplacement$: Observable<void>;
  } = { currentSession: SESSION, sessionReplacement$: EMPTY };
  const readinessStub: { sessionReady$: Observable<boolean> } = {
    sessionReady$: new BehaviorSubject(true),
  };
  let sessionReplacement: Subject<void>;
  let sessionReady: BehaviorSubject<boolean>;

  beforeEach(() => {
    sessionReplacement = new Subject<void>();
    sessionReady = new BehaviorSubject(true);
    sessionStub.currentSession = SESSION;
    sessionStub.sessionReplacement$ = sessionReplacement.asObservable();
    readinessStub.sessionReady$ = sessionReady.asObservable();

    gatewayStub.getJobStatus.calls.reset();
    gatewayStub.getJobStatus.and.returnValue(of(jobStatus(OrderJobStatus.PROCESSING)));

    trackingReaderStub.list.calls.reset();
    trackingReaderStub.list.and.returnValue([]);
    trackingReaderStub.remove.calls.reset();
    trackingReaderStub.remove.and.callFake(() => undefined);

    configure();
  });

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        ClientePedidosTrackingFacade,
        { provide: CLIENTE_PEDIDOS_TRACKING_GATEWAY, useValue: gatewayStub },
        { provide: CLIENTE_TRACKING_READER, useValue: trackingReaderStub },
        { provide: CLIENTE_SESSION_READER, useValue: sessionStub },
        { provide: CLIENTE_SESSION_READINESS_READER, useValue: readinessStub },
      ],
    });
  }

  function create(): ClientePedidosTrackingFacade {
    return TestBed.inject(ClientePedidosTrackingFacade);
  }

  it('keeps polling while the job is processing', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    const facade = create();

    facade.trackPending();
    tick(0);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledOnceWith('tracking-1');
    expect(facade.trackings()[0]).toEqual(
      jasmine.objectContaining({
        trackingId: 'tracking-1',
        status: OrderJobStatus.PROCESSING,
        attempts: 1,
        terminal: false,
      }),
    );

    tick(POLL_INTERVAL_MS);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(2);
    expect(facade.trackings()[0].attempts).toBe(2);
    expect(facade.trackings()[0].terminal).toBeFalse();
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();

    discardPeriodicTasks();
  }));

  it('stops on completion, removes the id and emits completion', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    gatewayStub.getJobStatus.and.returnValue(
      of(jobStatus(OrderJobStatus.COMPLETED, { orderId: 'order-1' })),
    );
    const facade = create();
    let completed = 0;
    facade.completed$.subscribe(() => completed++);

    facade.trackPending();
    tick(0);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);
    expect(trackingReaderStub.remove).toHaveBeenCalledOnceWith('tracking-1');
    expect(completed).toBe(1);
    expect(facade.trackings()[0]).toEqual(
      jasmine.objectContaining({
        trackingId: 'tracking-1',
        status: OrderJobStatus.COMPLETED,
        terminal: true,
      }),
    );

    tick(POLL_INTERVAL_MS * 3);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('stops on failure, keeps the id and the server message', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    gatewayStub.getJobStatus.and.returnValue(
      of(
        jobStatus(OrderJobStatus.FAILED, {
          errorCode: 'STOCK_UNAVAILABLE',
          errorMessage: 'No hay stock suficiente',
        }),
      ),
    );
    const facade = create();
    let completed = 0;
    facade.completed$.subscribe(() => completed++);

    facade.trackPending();
    tick(0);

    expect(trackingReaderStub.remove).not.toHaveBeenCalled();
    expect(completed).toBe(0);
    expect(facade.trackings()[0]).toEqual(
      jasmine.objectContaining({
        status: OrderJobStatus.FAILED,
        errorCode: 'STOCK_UNAVAILABLE',
        errorMessage: 'No hay stock suficiente',
        terminal: true,
      }),
    );

    tick(POLL_INTERVAL_MS * 2);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('stops on a dead letter and keeps the id', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    gatewayStub.getJobStatus.and.returnValue(of(jobStatus(OrderJobStatus.DEAD_LETTER)));
    const facade = create();
    let completed = 0;
    facade.completed$.subscribe(() => completed++);

    facade.trackPending();
    tick(0);

    expect(trackingReaderStub.remove).not.toHaveBeenCalled();
    expect(completed).toBe(0);
    expect(facade.trackings()[0]).toEqual(
      jasmine.objectContaining({
        status: OrderJobStatus.DEAD_LETTER,
        terminal: true,
      }),
    );

    tick(POLL_INTERVAL_MS * 2);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('shows a failed tracking again after recreating the facade with the same store', fakeAsync(() => {
    const persistedIds = ['tracking-1'];
    trackingReaderStub.list.and.callFake(() => [...persistedIds]);
    trackingReaderStub.remove.and.callFake((trackingId: string) => {
      const index = persistedIds.indexOf(trackingId);
      if (index >= 0) {
        persistedIds.splice(index, 1);
      }
    });
    gatewayStub.getJobStatus.and.returnValue(
      of(jobStatus(OrderJobStatus.FAILED, { errorMessage: 'No hay stock suficiente' })),
    );

    const first = create();
    first.trackPending();
    tick(0);

    expect(first.trackings()[0]).toEqual(
      jasmine.objectContaining({
        trackingId: 'tracking-1',
        status: OrderJobStatus.FAILED,
        terminal: true,
      }),
    );
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();
    expect(persistedIds).toEqual(['tracking-1']);
    discardPeriodicTasks();

    TestBed.resetTestingModule();
    configure();
    gatewayStub.getJobStatus.calls.reset();
    gatewayStub.getJobStatus.and.returnValue(
      of(jobStatus(OrderJobStatus.FAILED, { errorMessage: 'No hay stock suficiente' })),
    );

    const second = create();
    second.trackPending();
    tick(0);

    expect(second.trackings()[0]).toEqual(
      jasmine.objectContaining({
        trackingId: 'tracking-1',
        status: OrderJobStatus.FAILED,
        terminal: true,
      }),
    );
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it('resets a persisted terminal tracking when polling starts again', fakeAsync(() => {
    const persistedIds = ['tracking-1'];
    trackingReaderStub.list.and.callFake(() => [...persistedIds]);
    gatewayStub.getJobStatus.and.returnValue(
      of(
        jobStatus(OrderJobStatus.FAILED, {
          errorCode: 'STOCK_UNAVAILABLE',
          errorMessage: 'No hay stock suficiente',
        }),
      ),
    );

    const first = create();
    first.trackPending();
    tick(0);

    expect(first.trackings()[0]).toEqual(
      jasmine.objectContaining({
        status: OrderJobStatus.FAILED,
        terminal: true,
        errorCode: 'STOCK_UNAVAILABLE',
        errorMessage: 'No hay stock suficiente',
      }),
    );
    discardPeriodicTasks();

    TestBed.resetTestingModule();
    configure();
    gatewayStub.getJobStatus.calls.reset();
    gatewayStub.getJobStatus.and.returnValue(of(jobStatus(OrderJobStatus.PROCESSING)));

    const second = create();
    second.trackPending();

    expect(second.trackings()[0]).toEqual(
      jasmine.objectContaining({
        trackingId: 'tracking-1',
        status: OrderJobStatus.PENDING,
        attempts: 0,
        terminal: false,
      }),
    );
    expect(second.trackings()[0].errorCode).toBeUndefined();
    expect(second.trackings()[0].errorMessage).toBeUndefined();

    tick(0);

    expect(second.trackings()[0]).toEqual(
      jasmine.objectContaining({
        status: OrderJobStatus.PROCESSING,
        attempts: 1,
        terminal: false,
      }),
    );

    tick(POLL_INTERVAL_MS);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(2);
    expect(second.trackings()[0].terminal).toBeFalse();

    gatewayStub.getJobStatus.and.returnValue(
      of(jobStatus(OrderJobStatus.FAILED, { errorCode: 'STOCK_UNAVAILABLE' })),
    );
    tick(POLL_INTERVAL_MS);

    expect(second.trackings()[0]).toEqual(
      jasmine.objectContaining({
        status: OrderJobStatus.FAILED,
        terminal: true,
        errorCode: 'STOCK_UNAVAILABLE',
      }),
    );
    discardPeriodicTasks();
  }));

  it('dismisses a terminal tracking and removes its persisted id', fakeAsync(() => {
    const persistedIds = ['tracking-1'];
    trackingReaderStub.list.and.callFake(() => [...persistedIds]);
    trackingReaderStub.remove.and.callFake((trackingId: string) => {
      const index = persistedIds.indexOf(trackingId);
      if (index >= 0) {
        persistedIds.splice(index, 1);
      }
    });
    gatewayStub.getJobStatus.and.returnValue(of(jobStatus(OrderJobStatus.FAILED)));

    const facade = create();
    facade.trackPending();
    tick(0);
    expect(facade.trackings().length).toBe(1);

    facade.dismiss('tracking-1');

    expect(trackingReaderStub.remove).toHaveBeenCalledOnceWith('tracking-1');
    expect(persistedIds).toEqual([]);
    expect(facade.trackings()).toEqual([]);
    discardPeriodicTasks();
  }));

  it('treats the first three 404s as transient and recovers', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    let calls = 0;
    gatewayStub.getJobStatus.and.callFake(() => {
      calls += 1;
      return calls <= 3
        ? throwError(() => new HttpErrorResponse({ status: 404 }))
        : of(jobStatus(OrderJobStatus.PROCESSING));
    });
    const facade = create();

    facade.trackPending();
    tick(0);
    tick(POLL_INTERVAL_MS);
    tick(POLL_INTERVAL_MS);

    expect(facade.trackings()[0].terminal).toBeFalse();
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();

    tick(POLL_INTERVAL_MS);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(4);
    expect(facade.trackings()[0].status).toBe(OrderJobStatus.PROCESSING);
    expect(facade.trackings()[0].terminal).toBeFalse();

    discardPeriodicTasks();
  }));

  it('turns the fourth initial 404 into a terminal error and keeps the id', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    gatewayStub.getJobStatus.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const facade = create();

    facade.trackPending();
    tick(0);
    tick(POLL_INTERVAL_MS);
    tick(POLL_INTERVAL_MS);

    expect(facade.trackings()[0].terminal).toBeFalse();
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();

    tick(POLL_INTERVAL_MS);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(4);
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();
    expect(facade.trackings()[0]).toEqual(
      jasmine.objectContaining({
        attempts: 4,
        errorCode: ClientePedidosTrackingError.NotFound,
        terminal: true,
      }),
    );

    tick(POLL_INTERVAL_MS * 3);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(4);
    discardPeriodicTasks();
  }));

  it('keeps polling when a 404 arrives after a status response', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    let calls = 0;
    gatewayStub.getJobStatus.and.callFake(() => {
      calls += 1;
      return calls <= 3
        ? of(jobStatus(OrderJobStatus.PROCESSING))
        : throwError(() => new HttpErrorResponse({ status: 404 }));
    });
    const facade = create();

    facade.trackPending();
    tick(0);
    tick(POLL_INTERVAL_MS);
    tick(POLL_INTERVAL_MS);

    expect(facade.trackings()[0].terminal).toBeFalse();

    tick(POLL_INTERVAL_MS);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(4);
    expect(facade.trackings()[0].terminal).toBeFalse();
    expect(facade.trackings()[0].status).toBe(OrderJobStatus.PROCESSING);
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();

    tick(POLL_INTERVAL_MS);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(5);
    expect(facade.trackings()[0].attempts).toBe(5);
    expect(facade.trackings()[0].terminal).toBeFalse();
    discardPeriodicTasks();
  }));

  it('stops at the attempt cap and keeps the id for a later reload', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    gatewayStub.getJobStatus.and.returnValue(of(jobStatus(OrderJobStatus.PROCESSING)));
    const facade = create();

    facade.trackPending();
    tick(0);
    for (let attempt = 1; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      tick(POLL_INTERVAL_MS);
    }

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
    expect(facade.trackings()[0].attempts).toBe(MAX_POLL_ATTEMPTS);
    expect(facade.trackings()[0].terminal).toBeFalse();
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();

    tick(POLL_INTERVAL_MS * 3);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);

    facade.trackPending();
    tick(0);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS + 1);

    discardPeriodicTasks();
  }));

  it('cancels the pending timer and request when the facade is destroyed', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    const pending = new Subject<OrderJobStatusResponse>();
    gatewayStub.getJobStatus.and.returnValue(pending.asObservable());

    const fixture = TestBed.createComponent(TrackingFacadeHost);
    const facade = fixture.debugElement.injector.get(ClientePedidosTrackingFacade);

    facade.trackPending();
    tick(0);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);

    fixture.destroy();
    pending.next(jobStatus(OrderJobStatus.PROCESSING));
    tick(POLL_INTERVAL_MS * 3);

    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);
    expect(facade.trackings()[0].status).toBe(OrderJobStatus.PENDING);
    discardPeriodicTasks();
  }));

  it('preserves pending ids and resumes when the replacement keeps the same user id', fakeAsync(() => {
    trackingReaderStub.list.and.returnValue(['tracking-1']);
    const facade = create();
    facade.trackPending();
    tick(0);
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(1);

    sessionReady.next(false);
    sessionStub.currentSession = SESSION_SAME_ID_NEW_EMAIL;
    sessionReplacement.next();
    sessionReady.next(true);
    tick(0);

    expect(trackingReaderStub.list).toHaveBeenCalled();
    expect(gatewayStub.getJobStatus).toHaveBeenCalledTimes(2);
    expect(facade.trackings().map((view) => view.trackingId)).toEqual(['tracking-1']);
    discardPeriodicTasks();
  }));

  it('isolates the previous user key and shows only the incoming user ids', fakeAsync(() => {
    const storedByUser = new Map<string, string[]>([
      ['user-1', ['tracking-1']],
      ['user-3', ['tracking-3']],
    ]);
    trackingReaderStub.list.and.callFake(() => {
      const userId = sessionStub.currentSession?.user.id;
      return userId === undefined ? [] : [...(storedByUser.get(userId) ?? [])];
    });
    const facade = create();
    facade.trackPending();
    tick(0);
    expect(facade.trackings().map((view) => view.trackingId)).toEqual(['tracking-1']);

    sessionReady.next(false);
    sessionStub.currentSession = SESSION_OTHER_USER;
    sessionReplacement.next();
    sessionReady.next(true);
    tick(0);

    expect(storedByUser.get('user-1')).toEqual(['tracking-1']);
    expect(facade.trackings().map((view) => view.trackingId)).toEqual(['tracking-3']);
    expect(gatewayStub.getJobStatus.calls.allArgs()).toEqual([['tracking-1'], ['tracking-3']]);
    expect(trackingReaderStub.remove).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));
});
