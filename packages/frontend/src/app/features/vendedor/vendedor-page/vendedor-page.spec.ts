import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MetodoPago, OrderEstado, VendedorEstado } from '@agua/contracts';
import type { OrderResponse, VendedorProfile } from '@agua/contracts';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { VendedorPedidosService } from '../vendedor-pedidos.service';
import { VendedorProfileService } from '../vendedor-profile.service';
import { VendedorPage } from './vendedor-page';

const PROFILE: VendedorProfile = {
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
  ciudadDefault: 'Córdoba',
  zonaEntrega: 'Norte',
};

function order(id: string, estado: OrderEstado, createdAt: string): OrderResponse {
  return {
    id,
    pedidoNumero: `P-${id}`,
    clienteId: 'cliente-user-1',
    vendedorId: 'vendedor-1',
    items: [
      {
        productId: 'producto-1',
        nombre: 'Agua mineral 500 ml',
        cantidad: 2,
        precioUnitario: 1000,
      },
    ],
    totalSinIva: 2000,
    iva: 420,
    total: 2420,
    estado,
    metodoPago: MetodoPago.CONTRA_ENTREGA,
    direccion: { calle: 'Av. Corrientes', numero: '1234' },
    createdAt,
    updatedAt: createdAt,
  };
}

describe('VendedorPage', () => {
  let fixture: ComponentFixture<VendedorPage>;
  let element: HTMLElement;
  const serviceStub = { getProfile: jasmine.createSpy('getProfile') };
  const pedidosStub = { list: jasmine.createSpy('list') };

  beforeEach(async () => {
    serviceStub.getProfile.calls.reset();
    pedidosStub.list.calls.reset();
    pedidosStub.list.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [VendedorPage],
      providers: [
        provideRouter([]),
        { provide: VendedorProfileService, useValue: serviceStub },
        { provide: VendedorPedidosService, useValue: pedidosStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingProfile(): Observable<VendedorProfile> {
    return new Observable<VendedorProfile>(() => {});
  }

  it('shows the loading state while the profile request is in flight', () => {
    serviceStub.getProfile.and.returnValue(pendingProfile());

    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando tu perfil');
  });

  it('renders the profile card with Spanish estado label and delivery data', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    expect(element.textContent).toContain('Aguas del Sur');
    expect(element.textContent).toContain('Ana Gómez');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain('Norte');
    expect(element.textContent).toContain('Córdoba');
  });

  it('falls back to the full name when empresa is missing', () => {
    serviceStub.getProfile.and.returnValue(of({ ...PROFILE, empresa: undefined }));

    fixture.detectChanges();

    expect(element.textContent).toContain('Ana Gómez');
  });

  it('omits zonaEntrega and ciudadDefault when absent', () => {
    serviceStub.getProfile.and.returnValue(
      of({ ...PROFILE, zonaEntrega: undefined, ciudadDefault: undefined }),
    );

    fixture.detectChanges();

    expect(element.textContent).not.toContain('Zona de entrega');
    expect(element.textContent).not.toContain('Ciudad');
  });

  it('shows the error state and reloads the profile on retry', () => {
    serviceStub.getProfile.and.returnValues(throwError(() => new Error('boom')), of(PROFILE));

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar tu perfil');

    const retryButton = element.querySelector<HTMLButtonElement>('button');
    retryButton?.click();
    fixture.detectChanges();

    expect(serviceStub.getProfile).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Aguas del Sur');
  });

  it('settles into the failed state when the profile observable completes without emitting', () => {
    serviceStub.getProfile.and.returnValue(EMPTY);

    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos cargar tu perfil');
    expect(element.textContent).not.toContain('Cargando tu perfil');
  });

  it('settles into the failed state when the profile observable emits null', () => {
    serviceStub.getProfile.and.returnValue(of(null as unknown as VendedorProfile));

    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos cargar tu perfil');
  });

  it('links to the product catalog', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));

    fixture.detectChanges();

    const link = element.querySelector<HTMLAnchorElement>(
      'a[href="/vendedor/catalogo/productos"]',
    );
    expect(link?.textContent?.trim()).toBe('Gestionar catálogo');
  });

  it('shows the pendiente count derived from the orders list', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    pedidosStub.list.and.returnValue(
      of([
        order('1', OrderEstado.PENDIENTE, '2026-10-20T00:00:00.000Z'),
        order('2', OrderEstado.ENTREGADO, '2026-10-24T00:00:00.000Z'),
        order('3', OrderEstado.PENDIENTE, '2026-10-22T00:00:00.000Z'),
      ]),
    );

    fixture.detectChanges();

    const count = element.querySelector('.vendedor__pedidos-count');
    expect(count?.textContent).toContain('2');
  });

  it('shows the top 3 recent orders ordered by createdAt descending', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    pedidosStub.list.and.returnValue(
      of([
        order('1', OrderEstado.PENDIENTE, '2026-10-20T00:00:00.000Z'),
        order('2', OrderEstado.ENTREGADO, '2026-10-24T00:00:00.000Z'),
        order('3', OrderEstado.PENDIENTE, '2026-10-22T00:00:00.000Z'),
        order('4', OrderEstado.CONFIRMADO, '2026-10-23T00:00:00.000Z'),
      ]),
    );

    fixture.detectChanges();

    const numeros = element.querySelectorAll('.vendedor__pedido-numero');
    expect(Array.from(numeros).map((node) => node.textContent?.trim())).toEqual([
      'P-2',
      'P-4',
      'P-3',
    ]);
  });

  it('links each recent order to the pedidos page', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    pedidosStub.list.and.returnValue(
      of([order('1', OrderEstado.PENDIENTE, '2026-10-20T00:00:00.000Z')]),
    );

    fixture.detectChanges();

    const link = element.querySelector<HTMLAnchorElement>('a[href="/vendedor/pedidos"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('P-1');
  });

  it('keeps the profile card visible when the orders load fails, with a quiet inline retry', () => {
    serviceStub.getProfile.and.returnValue(of(PROFILE));
    pedidosStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of([order('1', OrderEstado.PENDIENTE, '2026-10-20T00:00:00.000Z')]),
    );

    fixture.detectChanges();

    // The profile card is still rendered.
    expect(element.textContent).toContain('Aguas del Sur');
    // The orders section degrades to its own retry, not the profile error.
    const retry = element.querySelector('.vendedor__pedidos-retry');
    expect(retry).not.toBeNull();

    (retry?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(pedidosStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('P-1');
  });
});
