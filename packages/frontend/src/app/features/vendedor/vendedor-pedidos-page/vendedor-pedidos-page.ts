import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { OrderEstado } from '@agua/contracts';
import type { OrderResponse } from '@agua/contracts';
import { ButtonModule } from 'primeng/button';
import { ORDER_ESTADO_LABELS, formatIsoDate } from '../../../shared/order-format';
import { VendedorPedidosService } from '../vendedor-pedidos.service';

const PAGE_SIZE = 10;

interface EstadoOption {
  value: OrderEstado | null;
  label: string;
}

const ESTADO_OPTIONS: EstadoOption[] = [
  { value: null, label: 'Todos' },
  { value: OrderEstado.PENDIENTE, label: ORDER_ESTADO_LABELS[OrderEstado.PENDIENTE] },
  { value: OrderEstado.CONFIRMADO, label: ORDER_ESTADO_LABELS[OrderEstado.CONFIRMADO] },
  { value: OrderEstado.EN_CAMINO, label: ORDER_ESTADO_LABELS[OrderEstado.EN_CAMINO] },
  { value: OrderEstado.ENTREGADO, label: ORDER_ESTADO_LABELS[OrderEstado.ENTREGADO] },
  { value: OrderEstado.CANCELADO, label: ORDER_ESTADO_LABELS[OrderEstado.CANCELADO] },
  { value: OrderEstado.VENCIDO, label: ORDER_ESTADO_LABELS[OrderEstado.VENCIDO] },
];

/**
 * Vendedor orders list. `orders.list` is unpaginated and unfiltered today, so
 * the page fetches once and paginates/filters client-side via an `estado`
 * select. State style mirrors the clientes-page (signals, loading/failed with
 * retry). Note: `OrderResponse.clienteId` is a V1-compatibility field carrying
 * `AUTH_USER.id` (the JWT `sub`, i.e. `clienteUserId`), NOT the domain
 * `CLIENTE.id` — see the `clienteUserId` note on `OrderResponse` in
 * `@agua/contracts` and the identity rule in AGENTS.md.
 */
@Component({
  selector: 'app-vendedor-pedidos-page',
  imports: [ButtonModule],
  templateUrl: './vendedor-pedidos-page.html',
  styleUrl: './vendedor-pedidos-page.scss',
})
export class VendedorPedidosPage implements OnInit {
  private readonly pedidosService = inject(VendedorPedidosService);

  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);

  // Applied client-side estado filter and current page.
  readonly estado = signal<OrderEstado | null>(null);
  readonly currentPage = signal(1);

  readonly estadoOptions = ESTADO_OPTIONS;

  readonly filteredOrders = computed(() => {
    const estado = this.estado();
    const orders = this.orders();
    return estado === null ? orders : orders.filter((order) => order.estado === estado);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredOrders().length / PAGE_SIZE)),
  );

  readonly pageOrders = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredOrders().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.pedidosService.list().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load();
  }

  onEstadoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.estado.set(select.value === '' ? null : (select.value as OrderEstado));
    this.currentPage.set(1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  estadoLabel(estado: OrderEstado): string {
    return ORDER_ESTADO_LABELS[estado];
  }

  formatFecha(createdAt: string): string {
    return formatIsoDate(createdAt);
  }

  formatTotal(total: number): string {
    return this.priceFormatter.format(total);
  }
}
