import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderEstado, VendedorEstado } from '@agua/contracts';
import type { OrderResponse, VendedorProfile } from '@agua/contracts';
import { ORDER_ESTADO_LABELS } from '../../../shared/order-format';
import { VendedorPedidosService } from '../vendedor-pedidos.service';
import { VendedorProfileService } from '../vendedor-profile.service';

const ESTADO_LABELS: Record<VendedorEstado, string> = {
  [VendedorEstado.PENDIENTE]: 'Pendiente',
  [VendedorEstado.ACTIVO]: 'Activo',
  [VendedorEstado.INACTIVO]: 'Inactivo',
  [VendedorEstado.BLOQUEADO]: 'Bloqueado',
};

const RECENT_ORDERS_LIMIT = 3;

/**
 * Vendedor operational home. Loads the authenticated vendedor profile (from
 * the JWT, resolved server-side) and renders a profile card with quick access
 * to the product catalog. The orders summary loads independently from the
 * profile: a failed orders request must never break the profile card, so it
 * owns its own loading/failed signals and a quiet inline retry.
 */
@Component({
  selector: 'app-vendedor-page',
  imports: [RouterLink],
  templateUrl: './vendedor-page.html',
  styleUrl: './vendedor-page.scss',
})
export class VendedorPage implements OnInit {
  private readonly profileService = inject(VendedorProfileService);
  private readonly pedidosService = inject(VendedorPedidosService);

  readonly profile = signal<VendedorProfile | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

  // Orders summary state, independent of the profile load.
  readonly orders = signal<OrderResponse[]>([]);
  readonly ordersLoading = signal(false);
  readonly ordersFailed = signal(false);

  readonly pendientesCount = computed(
    () => this.orders().filter((order) => order.estado === OrderEstado.PENDIENTE).length,
  );

  readonly recientes = computed(() =>
    [...this.orders()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_ORDERS_LIMIT),
  );

  ngOnInit(): void {
    this.loadProfile();
    this.loadOrders();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        if (profile === null || profile === undefined) {
          this.failed.set(true);
          this.loading.set(false);
          return;
        }
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
      complete: () => {
        if (this.profile() === null) {
          this.failed.set(true);
        }
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.loadProfile();
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersFailed.set(false);

    this.pedidosService.list().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.ordersLoading.set(false);
      },
      error: () => {
        this.ordersFailed.set(true);
        this.ordersLoading.set(false);
      },
    });
  }

  retryOrders(): void {
    this.loadOrders();
  }

  empresaLabel(profile: VendedorProfile): string {
    return profile.empresa || this.nombreCompleto(profile);
  }

  nombreCompleto(profile: VendedorProfile): string {
    return [profile.nombre, profile.apellido].filter(Boolean).join(' ');
  }

  estadoLabel(estado: VendedorEstado): string {
    return ESTADO_LABELS[estado];
  }

  orderEstadoLabel(estado: OrderEstado): string {
    return ORDER_ESTADO_LABELS[estado];
  }
}
