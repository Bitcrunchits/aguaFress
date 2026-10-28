import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { OrderEstado, OrderJobStatus } from '@agua/contracts';
import { AuthService } from '../../../core/auth/auth.service';
import { ClientePedidosFacade } from '../cliente-pedidos.facade';
import {
  ClientePedidosTrackingError,
  ClientePedidosTrackingFacade,
  type ClientePedidoTrackingView,
} from '../cliente-pedidos-tracking.facade';
import {
  CLIENTE_PEDIDOS_LIST_GATEWAY,
  CLIENTE_PEDIDOS_TRACKING_GATEWAY,
} from '../cliente-pedidos.gateway';
import { ClientePedidosService } from '../cliente-pedidos.service';
import { ClientePedidosListError } from '../cliente-pedidos-error';
import {
  ORDER_ESTADO_LABELS,
  formatIsoDate,
  isoDateOf,
} from '../cliente-pedidos-format';
import { CLIENTE_SESSION_READER } from '../cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from '../cliente-session-readiness.contract';
import { CLIENTE_TRACKING_READER } from '../cliente-tracking.contract';
import { ClienteTrackingStore } from '../cliente-tracking.store';

const LIST_ERROR_MESSAGES: Record<ClientePedidosListError, string> = {
  [ClientePedidosListError.Forbidden]: 'No tienes permiso para ver tus pedidos.',
  [ClientePedidosListError.Network]:
    'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  [ClientePedidosListError.Unexpected]:
    'No pudimos cargar tus pedidos. Inténtalo de nuevo en unos segundos.',
};

const TRACKING_STATUS_LABELS: Record<OrderJobStatus, string> = {
  [OrderJobStatus.PENDING]: 'Pendiente',
  [OrderJobStatus.PROCESSING]: 'Procesando',
  [OrderJobStatus.RETRYING]: 'Reintentando',
  [OrderJobStatus.COMPLETED]: 'Completado',
  [OrderJobStatus.FAILED]: 'Falló',
  [OrderJobStatus.DEAD_LETTER]: 'No se pudo procesar',
};

/**
 * Cliente orders list presentation. List state lives in
 * `ClientePedidosFacade` and polling in `ClientePedidosTrackingFacade`; this
 * page renders both, owns the Spanish copy, forwards the retry action,
 * reloads the list when a pending tracking completes, and links each loaded
 * order to its detail page.
 */
@Component({
  selector: 'app-cliente-pedidos-page',
  imports: [RouterLink],
  templateUrl: './cliente-pedidos-page.html',
  styleUrl: './cliente-pedidos-page.scss',
  providers: [
    ClientePedidosFacade,
    ClientePedidosTrackingFacade,
    { provide: CLIENTE_PEDIDOS_LIST_GATEWAY, useExisting: ClientePedidosService },
    { provide: CLIENTE_PEDIDOS_TRACKING_GATEWAY, useExisting: ClientePedidosService },
    { provide: CLIENTE_TRACKING_READER, useExisting: ClienteTrackingStore },
    { provide: CLIENTE_SESSION_READER, useExisting: AuthService },
    { provide: CLIENTE_SESSION_READINESS_READER, useExisting: AuthService },
  ],
})
export class ClientePedidosPage implements OnInit {
  protected readonly vm = inject(ClientePedidosFacade);
  protected readonly trackingVm = inject(ClientePedidosTrackingFacade);
  private readonly destroyRef = inject(DestroyRef);

  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  constructor() {
    this.trackingVm.completed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.vm.loadOrders());
  }

  ngOnInit(): void {
    this.vm.loadOrders();
    this.trackingVm.trackPending();
  }

  estadoLabel(estado: OrderEstado): string {
    return ORDER_ESTADO_LABELS[estado];
  }

  trackingStatusLabel(status: OrderJobStatus): string {
    return TRACKING_STATUS_LABELS[status];
  }

  listErrorMessage(error: ClientePedidosListError): string {
    return LIST_ERROR_MESSAGES[error];
  }

  trackingMessage(tracking: ClientePedidoTrackingView): string {
    if (!tracking.terminal) {
      return '';
    }
    if (tracking.errorMessage !== undefined && tracking.errorMessage.length > 0) {
      return tracking.errorMessage;
    }
    if (tracking.errorCode === ClientePedidosTrackingError.NotFound) {
      return 'No encontramos el seguimiento de este pedido. Actualiza la lista e inténtalo de nuevo.';
    }
    if (
      tracking.status === OrderJobStatus.FAILED ||
      tracking.status === OrderJobStatus.DEAD_LETTER
    ) {
      return 'No pudimos procesar tu pedido. Inténtalo de nuevo o contacta al vendedor.';
    }
    return '';
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
