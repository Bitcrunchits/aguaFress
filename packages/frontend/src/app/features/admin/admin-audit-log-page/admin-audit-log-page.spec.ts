import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AuditAction,
  UserRole,
  type AuditLogEntry,
  type AuditLogListResponse,
} from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AdminAuditLogService } from '../admin-audit-log.service';
import { AdminAuditLogPage } from './admin-audit-log-page';

const ENTRY: AuditLogEntry = {
  id: 'log-1',
  accion: AuditAction.USER_LOGIN,
  actorUserId: 'auth-user-1',
  email: 'admin@example.com',
  role: UserRole.SUPER_ADMIN,
  targetId: null,
  detalle: null,
  ip: '1.2.3.4',
  createdAt: '2026-01-15T12:00:00.000Z',
};

function pageResponse(
  items: AuditLogEntry[],
  page = 1,
  totalPages = 1,
): AuditLogListResponse {
  return {
    data: items,
    pagination: { page, limit: 20, total: items.length, totalPages },
  };
}

describe('AdminAuditLogPage', () => {
  let fixture: ComponentFixture<AdminAuditLogPage>;
  let element: HTMLElement;
  const serviceStub = { list: jasmine.createSpy('list') };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AdminAuditLogPage],
      providers: [{ provide: AdminAuditLogService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAuditLogPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<AuditLogListResponse> {
    return new Observable<AuditLogListResponse>(() => {});
  }

  it('shows the loading state while the audit-log request is in flight', () => {
    serviceStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(element.textContent).toContain('Cargando auditoría');
  });

  it('renders rows with action labels and degrades null cells to an em dash', () => {
    serviceStub.list.and.returnValue(of(pageResponse([ENTRY])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Inicio de sesión');
    expect(element.textContent).toContain('admin@example.com');
    expect(element.textContent).toContain('super_admin');
    expect(element.textContent).toContain('1.2.3.4');
    expect(element.textContent).toContain('2026-01-15');

    const cells = element.querySelectorAll('tbody tr:first-child td');
    expect(cells[4].textContent?.trim()).toBe('—');
  });

  it('falls back to the raw action value when the action is not in the enum', () => {
    const unknown = { ...ENTRY, accion: 'SOME_NEW_ACTION' as AuditAction };
    serviceStub.list.and.returnValue(of(pageResponse([unknown])));

    fixture.detectChanges();

    expect(element.textContent).toContain('SOME_NEW_ACTION');
  });

  it('shows the empty state when there are no audit events', () => {
    serviceStub.list.and.returnValue(of(pageResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay eventos de auditoría registrados todavía.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    serviceStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of(pageResponse([ENTRY])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar la auditoría');

    element.querySelector<HTMLButtonElement>('.audit-log__state--error button')?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Inicio de sesión');
  });

  it('sends the accion filter when applied', () => {
    serviceStub.list.and.returnValue(of(pageResponse([ENTRY])));

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#audit-log-accion')!;
    select.value = AuditAction.VENDEDOR_UPDATED;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('#audit-log-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, accion: AuditAction.VENDEDOR_UPDATED },
    ]);
  });

  it('sends the date filters when applied', () => {
    serviceStub.list.and.returnValue(of(pageResponse([ENTRY])));

    fixture.detectChanges();

    const from = element.querySelector<HTMLInputElement>('#audit-log-from')!;
    from.value = '2026-01-01';
    from.dispatchEvent(new Event('input'));
    const to = element.querySelector<HTMLInputElement>('#audit-log-to')!;
    to.value = '2026-01-31';
    to.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('#audit-log-apply')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, from: '2026-01-01', to: '2026-01-31' },
    ]);
  });

  it('clears filters and reloads the first page', () => {
    serviceStub.list.and.returnValue(of(pageResponse([ENTRY])));

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#audit-log-accion')!;
    select.value = AuditAction.USER_LOGIN;
    select.dispatchEvent(new Event('change'));
    element.querySelector<HTMLButtonElement>('#audit-log-apply')!.click();
    fixture.detectChanges();
    expect(serviceStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, accion: AuditAction.USER_LOGIN },
    ]);

    element.querySelector<HTMLButtonElement>('#audit-log-clear')!.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 1, limit: 20 }]);
  });

  it('disables Anterior and Siguiente at the pagination bounds', () => {
    serviceStub.list.and.returnValues(
      of(pageResponse([ENTRY], 1, 2)),
      of(pageResponse([{ ...ENTRY, id: 'log-2' }], 2, 2)),
    );

    fixture.detectChanges();

    let [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.audit-log__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 2');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([{ page: 2, limit: 20 }]);
    [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.audit-log__pagination button',
    );
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeTrue();
  });
});
