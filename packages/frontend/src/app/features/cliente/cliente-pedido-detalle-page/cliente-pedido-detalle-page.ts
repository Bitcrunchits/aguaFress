import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { DireccionEntrega, OrderResponse } from '@agua/contracts';
import { AuthService } from '../../../core/auth/auth.service';
import { ClientePedidoDetalleFacade } from '../cliente-pedido-detalle.facade';
import { ClientePedidoDetalleError } from '../cliente-pedido-detalle-error';
import {
  METODO_PAGO_LABELS,
  ORDER_ESTADO_LABELS,
  formatIsoDate,
  isoDateOf,
} from '../cliente-pedidos-format';
import { CLIENTE_PEDIDOS_DETAIL_GATEWAY } from '../cliente-pedidos.gateway';
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
  imports: [RouterLink],
  templateUrl: './cliente-pedido-detalle-page.html',
  styleUrl: './cliente-pedido-detalle-page.scss',
  providers: [
    ClientePedidoDetalleFacade,
    { provide: CLIENTE_PEDIDOS_DETAIL_GATEWAY, useExisting: ClientePedidosService },
    { provide: CLIENTE_SESSION_READER, useExisting: AuthService },
    { provide: CLIENTE_SESSION_READINESS_READER, useExisting: AuthService },
  ],
})
export class ClientePedidoDetallePage implements OnInit {
  protected readonly vm = inject(ClientePedidoDetalleFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private orderId: string | null = null;

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

  estadoLabel(estado: OrderEstado): string {
    return ORDER_ESTADO_LABELS[estado];
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
