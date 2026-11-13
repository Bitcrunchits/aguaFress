import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { LinkInvitacionItem } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { QrCodeService } from '../qr-code.service';
import { VendedorInvitacionesService } from '../vendedor-invitaciones.service';
import { VendedorInvitacionesPage } from './vendedor-invitaciones-page';

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';

function item(id: string, overrides: Partial<LinkInvitacionItem> = {}): LinkInvitacionItem {
  return {
    id,
    token: `TOKEN-${id}`,
    activo: true,
    expiresAt: FUTURE,
    createdAt: '2026-10-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('VendedorInvitacionesPage', () => {
  let fixture: ComponentFixture<VendedorInvitacionesPage>;
  let page: VendedorInvitacionesPage;
  let element: HTMLElement;

  const serviceStub = {
    list: jasmine.createSpy('list'),
    create: jasmine.createSpy('create'),
    deactivate: jasmine.createSpy('deactivate'),
  };
  const qrStub = { toDataUrl: jasmine.createSpy('toDataUrl') };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    serviceStub.create.calls.reset();
    serviceStub.deactivate.calls.reset();
    qrStub.toDataUrl.calls.reset();
    qrStub.toDataUrl.and.returnValue(of('data:image/png;base64,abc'));

    await TestBed.configureTestingModule({
      imports: [VendedorInvitacionesPage],
      providers: [
        { provide: VendedorInvitacionesService, useValue: serviceStub },
        { provide: QrCodeService, useValue: qrStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorInvitacionesPage);
    page = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<LinkInvitacionItem[]> {
    return new Observable<LinkInvitacionItem[]>(() => {});
  }

  it('shows the loading state while the list request is in flight', () => {
    serviceStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando invitaciones');
  });

  it('renders rows with estado badge and formatted dates', () => {
    serviceStub.list.and.returnValue(
      of([
        item('1'),
        item('2', { activo: false }),
        item('3', { expiresAt: PAST }),
      ]),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('TOKEN-1');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain('Desactivado');
    expect(element.textContent).toContain('Expirado');
    expect(element.textContent).toContain('2026-10-24');
  });

  it('offers Desactivar only for active invitations', () => {
    serviceStub.list.and.returnValue(
      of([
        item('1'),
        item('2', { activo: false }),
        item('3', { expiresAt: PAST }),
      ]),
    );

    fixture.detectChanges();

    const rows = Array.from(element.querySelectorAll<HTMLElement>('tbody tr'));
    const deactivateCount = rows.filter((row) => row.textContent?.includes('Desactivar')).length;
    expect(deactivateCount).toBe(1);
    expect(rows.length).toBe(3);
  });

  it('creates an invitation, renders its QR and copyable URL', () => {
    serviceStub.list.and.returnValue(of([]));
    serviceStub.create.and.returnValue(
      of({ linkUrl: 'https://agua.app/invitar/TOKEN-1', token: 'TOKEN-1', expiresAt: FUTURE }),
    );
    qrStub.toDataUrl.and.returnValue(of('data:image/png;base64,abc'));

    fixture.detectChanges();
    page.createInvitation();
    fixture.detectChanges();

    expect(serviceStub.create).toHaveBeenCalledTimes(1);
    expect(qrStub.toDataUrl).toHaveBeenCalledWith(`${location.origin}/invite/TOKEN-1`);
    expect(element.textContent).toContain('/invite/TOKEN-1');
    expect(element.textContent).toContain('Copiar enlace');
    expect(element.querySelector('img.invitaciones__qr')).not.toBeNull();
  });

  it('shows the invite URL even when the QR render fails', () => {
    serviceStub.list.and.returnValue(of([]));
    serviceStub.create.and.returnValue(
      of({ linkUrl: 'https://agua.app/invitar/TOKEN-1', token: 'TOKEN-1', expiresAt: FUTURE }),
    );
    qrStub.toDataUrl.and.returnValue(throwError(() => new Error('canvas')));

    fixture.detectChanges();
    page.createInvitation();
    fixture.detectChanges();

    expect(element.textContent).toContain('/invite/TOKEN-1');
    expect(element.querySelector('img.invitaciones__qr')).toBeNull();
  });

  it('shows the network error when creation cannot reach the server', () => {
    serviceStub.list.and.returnValue(of([]));
    serviceStub.create.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    fixture.detectChanges();
    page.createInvitation();
    fixture.detectChanges();

    expect(page.createError()).toBe(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(page.creating()).toBeFalse();
  });

  it('deactivates an invitation and reloads the list', () => {
    serviceStub.list.and.returnValue(of([item('1')]));
    serviceStub.deactivate.and.returnValue(of(null));

    fixture.detectChanges();
    page.deactivate(item('1'));
    fixture.detectChanges();

    expect(serviceStub.deactivate).toHaveBeenCalledOnceWith('1');
    expect(serviceStub.list).toHaveBeenCalledTimes(2);
  });

  it('does not deactivate a non-active invitation', () => {
    serviceStub.list.and.returnValue(of([item('2', { activo: false })]));

    fixture.detectChanges();
    page.deactivate(item('2', { activo: false }));

    expect(serviceStub.deactivate).not.toHaveBeenCalled();
  });

  it('copies the invite URL via the clipboard API', async () => {
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    serviceStub.list.and.returnValue(of([]));
    fixture.detectChanges();

    page.createdInvite.set({
      url: `${location.origin}/invite/TOKEN-1`,
      token: 'TOKEN-1',
      expiresAt: FUTURE,
      qrDataUrl: 'data:image/png;base64,abc',
    });
    fixture.detectChanges();

    page.copyLink(`${location.origin}/invite/TOKEN-1`);
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(`${location.origin}/invite/TOKEN-1`);
    expect(page.copied()).toBeTrue();
  });

  it('shows the empty state when there are no invitations', () => {
    serviceStub.list.and.returnValue(of([]));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay invitaciones para mostrar.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    serviceStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of([item('1')]),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar las invitaciones');

    element.querySelector<HTMLButtonElement>('.invitaciones__state--error button')?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('TOKEN-1');
  });
});
