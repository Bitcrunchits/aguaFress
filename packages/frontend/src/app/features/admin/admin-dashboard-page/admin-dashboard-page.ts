import { Component, OnInit, inject, signal } from '@angular/core';
import type { SuperAdminDashboardResponse } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { AdminDashboardService } from '../admin-dashboard.service';

interface DashboardMetric {
  label: string;
  value: number;
}

/**
 * Super-admin dashboard: renders the six consolidated metrics from the
 * gateway `super-admin.dashboard` action. Metrics are counts only (#) — no
 * sensitive per-cliente data is exposed here.
 */
@Component({
  selector: 'app-admin-dashboard-page',
  imports: [ButtonModule],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
})
export class AdminDashboardPage implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);

  readonly metrics = signal<DashboardMetric[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.dashboardService.getDashboard().subscribe({
      next: (response) => {
        this.metrics.set(toMetrics(response));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.loadDashboard();
  }
}

function toMetrics(response: SuperAdminDashboardResponse): DashboardMetric[] {
  return [
    { label: 'Vendedores', value: response.totalVendedores },
    { label: 'Vendedores activos', value: response.vendedoresActivos },
    { label: 'Vendedores pendientes', value: response.vendedoresPendientes },
    { label: 'Clientes', value: response.totalClientes },
    { label: 'Clientes con vendedor', value: response.clientesConVendedor },
    { label: 'Super administradores', value: response.totalSuperAdmins },
  ];
}
