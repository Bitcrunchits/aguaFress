import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SuperAdminDashboardResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AdminDashboardService } from '../admin-dashboard.service';
import { AdminDashboardPage } from './admin-dashboard-page';

const DASHBOARD: SuperAdminDashboardResponse = {
  totalVendedores: 12,
  vendedoresActivos: 8,
  vendedoresPendientes: 4,
  totalClientes: 95,
  clientesConVendedor: 90,
  totalSuperAdmins: 2,
};

describe('AdminDashboardPage', () => {
  let fixture: ComponentFixture<AdminDashboardPage>;
  let element: HTMLElement;
  const serviceStub = { getDashboard: jasmine.createSpy('getDashboard') };

  beforeEach(async () => {
    serviceStub.getDashboard.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AdminDashboardPage],
      providers: [{ provide: AdminDashboardService, useValue: serviceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardPage);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the loading state while the dashboard request is in flight', () => {
    serviceStub.getDashboard.and.returnValue(
      new Observable<SuperAdminDashboardResponse>(() => {}),
    );

    fixture.detectChanges();

    expect(serviceStub.getDashboard).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Cargando métricas');
  });

  it('renders the six consolidated metrics', () => {
    serviceStub.getDashboard.and.returnValue(of(DASHBOARD));

    fixture.detectChanges();

    expect(element.textContent).toContain('Vendedores');
    expect(element.textContent).toContain('Vendedores activos');
    expect(element.textContent).toContain('Vendedores pendientes');
    expect(element.textContent).toContain('Clientes');
    expect(element.textContent).toContain('Clientes con vendedor');
    expect(element.textContent).toContain('Super administradores');

    const values = Array.from(element.querySelectorAll('.dashboard__metric-value')).map(
      (node) => node.textContent?.trim(),
    );
    expect(values).toEqual(['12', '8', '4', '95', '90', '2']);
  });

  it('shows the error state and reloads the metrics on retry', () => {
    serviceStub.getDashboard.and.returnValues(
      throwError(() => new Error('boom')),
      of(DASHBOARD),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar las métricas');

    element.querySelector<HTMLButtonElement>('.dashboard__state--error button')?.click();
    fixture.detectChanges();

    expect(serviceStub.getDashboard).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Vendedores');
  });
});
