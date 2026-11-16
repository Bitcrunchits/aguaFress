import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { DireccionEntrega, OrderResponse } from '@agua/contracts';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { ClientePedidoDetalleFacade } from '../cliente-pedido-detalle.facade';
import { ClientePedidoDetalleError } from '../cliente-pedido-detalle-error';
import { ClientePedidoCancelError } from '../cliente-pedido-cancel-error';
import {
  ClientePedidoRepeatFacade,
  ClientePedidoRepeatOutcome,
} from '../cliente-pedido-repeat.facade';
import { CLIENTE_PEDIDO_REPEAT_GATEWAY } from '../cliente-pedido-repeat.gateway';
import { ClientePedidoRepeatService } from '../cliente-pedido-repeat.service';
import {
  METODO_PAGO_LABELS,
  ORDER_ESTADO_LABELS,
  ORDER_ESTADO_TONES,
  formatIsoDate,
  isoDateOf,
} from '../../../shared/order-format';
import {
  StatusLabelComponent,
  type StatusLabelTone,
} from '../../../shared/status-label/status-label';
import { CLIENTE_PEDIDO_CANCEL_GATEWAY, CLIENTE_PEDIDOS_DETAIL_GATEWAY } from '../cliente-pedidos.gateway';
import { ClientePedidosService } from '../cliente-pedidos.service';
import { CLIENTE_SESSION_READER } from '../cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from '../cliente-session-readiness.contract';

type OrderItem = OrderResponse['items'][number];

/**
 * Cliente order detail presentation. State and coordination live in
 * `ClientePedidoDetalleFacade`; this page reads the order id from the route,
 * renders it, owns the Spanish copy, and forwards the retry action.
 */
@Component({
  selector: 'app-cliente-pedido-detalle-page',
  imports: [RouterLink, ConfirmDialogComponent, StatusLabelComponent],
  templateUrl: './cliente-pedido-detalle-page.html',
  styleUrl: './cliente-pedido-detalle-page.scss',
  providers: [
    ClientePedidoDetalleFacade,
    ClientePedidoRepeatFacade,
    { provide: CLIENTE_PEDIDOS_DETAIL_GATEWAY, useExisting: ClientePedidosService },
    { provide: CLIENTE_PEDIDO_CANCEL_GATEWAY, useExisting: ClientePedidosService },
    { provide: CLIENTE_PEDIDO_REPEAT_GATEWAY, useExisting: ClientePedidoRepeatService },
    { provide: CLIENTE_SESSION_READER, useExisting: AuthService },
    { provide: CLIENTE_SESSION_READINESS_READER, useExisting: AuthService },
  ],
})
export class ClientePedidoDetallePage implements OnInit {
  protected readonly vm = inject(ClientePedidoDetalleFacade);
  protected readonly repeat = inject(ClientePedidoRepeatFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private orderId: string | null = null;

  protected readonly OrderEstado = OrderEstado;
  protected readonly cancelDialogOpen = signal(false);

  constructor() {
    // Close the confirmation dialog once the order leaves PENDIENTE, whether
    // the cancel succeeded (CANCELADO) or a 403 reloaded a new server-side
    // estado. Failures keep the dialog open to show the retryable error.
    effect(() => {
      if (!this.cancelDialogOpen()) {
        return;
      }
      const order = this.vm.order();
      if (order !== null && order.estado !== OrderEstado.PENDIENTE) {
        this.cancelDialogOpen.set(false);
      }
    });

    // Once every item was re-added, leave for the cart so the client sees the
    // resulting cart instead of a stale detail view.
    effect(() => {
      if (this.repeat.navigateToCart()) {
        void this.router.navigate(['/cliente/carrito']);
      }
    });
  }

  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const orderId = params.get('id');
        this.orderId = orderId;
        if (orderId !== null) {
          this.vm.loadOrder(orderId);
        }
      });
  }

  retry(): void {
    if (this.orderId !== null) {
      this.vm.loadOrder(this.orderId);
    }
  }

  openCancelDialog(): void {
    this.vm.clearCancelError();
    this.cancelDialogOpen.set(true);
  }

  cancelCancelDialog(): void {
    if (this.vm.cancelling()) {
      return;
    }
    this.cancelDialogOpen.set(false);
  }

  confirmCancel(): void {
    this.vm.cancelOrder();
  }

  cancelErrorMessage(error: ClientePedidoCancelError): string {
    switch (error) {
      case ClientePedidoCancelError.Network:
        return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      default:
        return 'No pudimos cancelar el pedido. Inténtalo de nuevo en unos segundos.';
    }
  }

  repeatOrder(): void {
    const order = this.vm.order();
    if (order !== null) {
      this.repeat.repeatOrder(order);
    }
  }

  repeatOutcomeLabel(outcome: ClientePedidoRepeatOutcome): string {
    switch (outcome) {
      case ClientePedidoRepeatOutcome.OutOfStock:
        return 'sin stock';
      case ClientePedidoRepeatOutcome.Forbidden:
        return 'no disponible';
      case ClientePedidoRepeatOutcome.Network:
        return 'sin conexión';
      default:
        return 'no se pudo agregar';
    }
  }

  hasAddedItems(): boolean {
    return this.repeat.results().length > this.repeat.failedResults().length;
  }

  estadoLabel(estado: OrderEstado): string {
    return ORDER_ESTADO_LABELS[estado];
  }

  orderEstadoTone(estado: OrderEstado): StatusLabelTone {
    return ORDER_ESTADO_TONES[estado];
  }

  metodoPagoLabel(metodoPago: MetodoPago): string {
    return METODO_PAGO_LABELS[metodoPago];
  }

  subtotal(item: OrderItem): number {
    return item.cantidad * item.precioUnitario;
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

  direccionDetalle(direccion: DireccionEntrega): string {
    return [direccion.barrio, direccion.ciudad, direccion.provincia, direccion.codigoPostal]
      .filter((value): value is string => value !== undefined && value.length > 0)
      .join(', ');
  }

  errorMessage(error: ClientePedidoDetalleError): string {
    switch (error) {
      case ClientePedidoDetalleError.Network:
        return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      default:
        return 'No pudimos cargar el pedido. Inténtalo de nuevo en unos segundos.';
    }
  }
}
