import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { ClientePedidoFailure } from '../cliente-pedido-error';
import type { ClientePedidoDraft } from '../cliente-pedido-draft.contract';

const ORDER_FEEDBACK_MESSAGES: Record<ClientePedidoFailure, string> = {
  [ClientePedidoFailure.Validation]: 'Revisa los datos de entrega e inténtalo de nuevo.',
  [ClientePedidoFailure.ProviderLost]:
    'Tu proveedor ya no está disponible. Elige uno de nuevo.',
  [ClientePedidoFailure.Forbidden]: 'No tienes permiso para confirmar este pedido.',
  [ClientePedidoFailure.Network]:
    'No pudimos conectar con el servidor. Reintenta con los mismos datos.',
  [ClientePedidoFailure.Unexpected]:
    'No pudimos confirmar el pedido. Inténtalo de nuevo en unos segundos.',
};

/**
 * `Validators.required` accepts whitespace-only input, but `buildDireccion()`
 * trims it to an empty string. Reject blank required text here so the cliente
 * sees the error instead of a server-side 400.
 */
function nonBlankText(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

/**
 * Delivery-address form for checkout. Owns its validation and error copy and
 * emits the draft only when it is valid and the screen is idle; the parent
 * page owns the cart state and the confirmation request.
 */
@Component({
  selector: 'app-cliente-checkout-form',
  imports: [ReactiveFormsModule],
  templateUrl: './cliente-checkout-form.html',
  styleUrl: './cliente-checkout-form.scss',
})
export class ClienteCheckoutForm {
  readonly submitting = input(false);
  readonly mutationInFlight = input(false);
  readonly feedback = input<ClientePedidoFailure | null>(null);
  readonly confirm = output<ClientePedidoDraft>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly calleInput = viewChild<ElementRef<HTMLInputElement>>('calleInput');
  private readonly numeroInput = viewChild<ElementRef<HTMLInputElement>>('numeroInput');

  readonly form = this.formBuilder.nonNullable.group({
    calle: ['', [nonBlankText]],
    numero: ['', [nonBlankText]],
    pisoDepto: [''],
    referencia: [''],
    barrio: [''],
    ciudad: [''],
    provincia: [''],
    codigoPostal: [''],
    observaciones: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }
    if (this.submitting() || this.mutationInFlight()) {
      return;
    }
    this.confirm.emit(this.form.getRawValue());
  }

  showCalleError(): boolean {
    const control = this.form.controls.calle;
    return control.invalid && (control.touched || control.dirty);
  }

  showNumeroError(): boolean {
    const control = this.form.controls.numero;
    return control.invalid && (control.touched || control.dirty);
  }

  showValidationSummary(): boolean {
    return this.form.invalid && this.form.touched;
  }

  feedbackMessage(): string {
    const failure = this.feedback();
    return failure === null ? '' : ORDER_FEEDBACK_MESSAGES[failure];
  }

  private focusFirstInvalidField(): void {
    const target = this.form.controls.calle.invalid
      ? this.calleInput()
      : this.form.controls.numero.invalid
        ? this.numeroInput()
        : null;
    target?.nativeElement.focus();
  }
}
