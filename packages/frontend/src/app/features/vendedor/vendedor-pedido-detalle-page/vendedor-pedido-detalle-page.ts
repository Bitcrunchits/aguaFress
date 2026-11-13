import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { DireccionEntrega, OrderResponse } from '@agua/contracts';
import { catchError, forkJoin, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import {
  METODO_PAGO_LABELS,
  ORDER_ESTADO_LABELS,
  formatIsoDate,
  isoDateOf,
} from '../../../shared/order-format';
import { VendedorClientesService } from '../vendedor-clientes.service';
import { VendedorPedidosService } from '../vendedor-pedidos.service';
import {
  buildClienteLookup,
  resolveClienteNombre,
  type ClienteLookupMap,
} from '../vendedor-pedidos-names';

type OrderItem = OrderResponse['items'][number];

/** Ordered lifecycle steps rendered by the static timeline. */
const TIMELINE_ESTADOS: readonly OrderEstado[] = [
  OrderEstado.PENDIENTE,
  OrderEstado.CONFIRMADO,
  OrderEstado.EN_CAMINO,
  OrderEstado.ENTREGADO,
];

/**
 * Vendedor order detail. Reads the order id from the route, loads
 * `orders.get-by-id` in parallel with the cartera (best-effort name lookup),
 * renders the order facts plus a static status timeline, and offers the state
 * transition actions the current `estado` allows. Follows the simple
 * vendedor signals style (loading/failed + action feedback), not the cliente
 * Facade pattern.
 */
@Component({
  selector: 'app-vendedor-pedido-detalle-page',
  imports: [ButtonModule, RouterLink],
  templateUrl: './vendedor-pedido-detalle-page.html',
  styleUrl: './vendedor-pedido-detalle-page.scss',
})
export class VendedorPedidoDetallePage implements OnInit {
  private readonly pedidosService = inject(VendedorPedidosService);
  private readonly clientesService = inject(VendedorClientesService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

  readonly actionInProgress = signal(false);
  readonly actionFailed = signal(false);
  readonly actionSuccess = signal<string | null>(null);

  readonly timeline = TIMELINE_ESTADOS;

  private clienteLookup: ClienteLookupMap = new Map();
  private orderId: string | null = null;

  readonly canConfirm = computed(() => this.order()?.estado === OrderEstado.PENDIENTE);
  readonly canMarkEnCamino = computed(() => this.order()?.estado === OrderEstado.CONFIRMADO);
  readonly canMarkEntregado = computed(() => this.order()?.estado === OrderEstado.EN_CAMINO);

  /**
   * True for states with no outgoing transition (ENTREGADO, CANCELADO, VENCIDO),
   * so the actions section renders the "no actions" notice instead of buttons.
   */
  readonly hasNoActions = computed(() => {
    const estado = this.order()?.estado;
    return (
      estado === OrderEstado.ENTREGADO ||
      estado === OrderEstado.CANCELADO ||
      estado === OrderEstado.VENCIDO
    );
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const orderId = params.get('id');
      this.orderId = orderId;
      if (orderId !== null) {
        this.load();
      }
    });
  }

  load(): void {
    if (this.orderId === null) {
      return;
    }
    this.loading.set(true);
    this.failed.set(false);

    forkJoin({
      order: this.pedidosService.getById(this.orderId),
      cartera: this.clientesService.listCarteraForLookup().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ order, cartera }) => {
        this.clienteLookup = buildClienteLookup(cartera);
        this.order.set(order);
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

  confirmarPedido(): void {
    const orderId = this.orderId;
    if (orderId === null) {
      return;
    }
    this.runAction(() => this.pedidosService.confirm(orderId), 'Pedido confirmado.');
  }

  marcarEnCamino(): void {
    const orderId = this.orderId;
    if (orderId === null) {
      return;
    }
    this.runAction(
      () => this.pedidosService.updateStatus(orderId, OrderEstado.EN_CAMINO),
      'Pedido marcado en camino.',
    );
  }

  marcarEntregado(): void {
    const orderId = this.orderId;
    if (orderId === null) {
      return;
    }
    this.runAction(
      () => this.pedidosService.updateStatus(orderId, OrderEstado.ENTREGADO),
      'Pedido marcado como entregado.',
    );
  }

  private runAction(action: () => Observable<unknown>, successMessage: string): void {
    this.actionInProgress.set(true);
    this.actionFailed.set(false);
    this.actionSuccess.set(null);

    action().subscribe({
      next: () => {
        this.actionInProgress.set(false);
        this.actionSuccess.set(successMessage);
        this.refreshOrder();
      },
      error: () => {
        this.actionInProgress.set(false);
        this.actionFailed.set(true);
      },
    });
  }

  /** Quiet reload after an action so the success message stays visible (no full-page loading flash). */
  private refreshOrder(): void {
    if (this.orderId === null) {
      return;
    }
    this.pedidosService.getById(this.orderId).subscribe({
      next: (order) => this.order.set(order),
      error: () => {
        // The action already reported success; keep the current order on a
        // refresh failure rather than masking the confirmation.
      },
    });
  }

  isTerminal(estado: OrderEstado): boolean {
    return estado === OrderEstado.CANCELADO || estado === OrderEstado.VENCIDO;
  }

  timelineStepClass(index: number): string {
    const order = this.order();
    if (order === null || this.isTerminal(order.estado)) {
      return 'timeline__step';
    }
    const currentIdx = TIMELINE_ESTADOS.indexOf(order.estado);
    if (index < currentIdx) {
      return 'timeline__step timeline__step--done';
    }
    if (index === currentIdx) {
      return 'timeline__step timeline__step--current';
    }
    return 'timeline__step timeline__step--pending';
  }

  estadoLabel(estado: OrderEstado): string {
    return ORDER_ESTADO_LABELS[estado];
  }

  metodoPagoLabel(metodoPago: MetodoPago): string {
    return METODO_PAGO_LABELS[metodoPago];
  }

  clienteNombre(order: OrderResponse): string {
    return resolveClienteNombre(order, this.clienteLookup);
  }

  subtotal(item: OrderItem): number {
    return item.cantidad * item.precioUnitario;
  }

  direccionDetalle(direccion: DireccionEntrega): string {
    return [direccion.barrio, direccion.ciudad, direccion.provincia, direccion.codigoPostal]
      .filter((value): value is string => value !== undefined && value.length > 0)
      .join(', ');
  }

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }

  isoDate(value: string): string | null {
    return isoDateOf(value);
  }

  formatDate(value: string): string {
    return formatIsoDate(value);
  }
}
