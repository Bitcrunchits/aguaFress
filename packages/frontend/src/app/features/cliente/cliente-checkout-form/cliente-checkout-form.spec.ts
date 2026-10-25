import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClienteCheckoutForm } from './cliente-checkout-form';
import { ClientePedidoFailure } from '../cliente-pedido-error';
import type { ClientePedidoDraft } from '../cliente-pedido-draft.contract';

describe('ClienteCheckoutForm', () => {
  let fixture: ComponentFixture<ClienteCheckoutForm>;
  let component: ClienteCheckoutForm;
  let element: HTMLElement;
  let emitted: ClientePedidoDraft[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ClienteCheckoutForm] }).compileComponents();
    fixture = TestBed.createComponent(ClienteCheckoutForm);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    emitted = [];
    component.confirm.subscribe((draft) => emitted.push(draft));
    fixture.detectChanges();
  });

  it('emits the delivery draft when the address is complete', () => {
    component.form.patchValue({ calle: 'Av. Siempre Viva', numero: '742' });
    component.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].calle).toBe('Av. Siempre Viva');
    expect(emitted[0].numero).toBe('742');
  });

  it('does not emit when the address is incomplete', () => {
    component.submit();
    fixture.detectChanges();

    expect(emitted.length).toBe(0);
    expect(element.querySelectorAll('.cliente__field-error').length).toBe(2);
  });

  it('does not emit whitespace-only required fields', () => {
    component.form.patchValue({ calle: '   ', numero: '\t' });
    component.submit();
    fixture.detectChanges();

    expect(emitted.length).toBe(0);
    expect(element.querySelectorAll('.cliente__field-error').length).toBe(2);
  });

  it('does not emit while the order is being submitted', () => {
    component.form.patchValue({ calle: 'Av. Siempre Viva', numero: '742' });
    fixture.componentRef.setInput('submitting', true);
    component.submit();

    expect(emitted.length).toBe(0);
  });

  it('does not emit while a cart mutation is in flight', () => {
    component.form.patchValue({ calle: 'Av. Siempre Viva', numero: '742' });
    fixture.componentRef.setInput('mutationInFlight', true);
    component.submit();

    expect(emitted.length).toBe(0);
  });

  it('disables the submit button while the screen is busy', () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const submit = element.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBeTrue();
  });

  it('shows the confirmation failure message', () => {
    fixture.componentRef.setInput('feedback', ClientePedidoFailure.Forbidden);
    fixture.detectChanges();

    expect(element.textContent).toContain('No tienes permiso para confirmar este pedido.');
  });

  it('announces invalid fields and links their errors', () => {
    component.submit();
    fixture.detectChanges();

    expect(element.querySelector('#cliente-carrito-validation-summary')?.textContent).toContain(
      'Revisa los datos de entrega',
    );

    const calle = element.querySelector('#cliente-carrito-calle') as HTMLInputElement;
    expect(calle.getAttribute('aria-required')).toBe('true');
    expect(calle.getAttribute('aria-invalid')).toBe('true');
    expect(calle.getAttribute('aria-describedby')).toBe('cliente-carrito-calle-error');
    expect(element.querySelector('#cliente-carrito-calle-error')?.textContent).toContain(
      'Ingresa la calle de entrega.',
    );
  });

  it('clears the error wiring once the address is valid', () => {
    component.submit();
    fixture.detectChanges();

    component.form.patchValue({ calle: 'Av. Siempre Viva', numero: '742' });
    fixture.detectChanges();

    const calle = element.querySelector('#cliente-carrito-calle') as HTMLInputElement;
    expect(calle.getAttribute('aria-invalid')).toBe('false');
    expect(calle.getAttribute('aria-describedby')).toBeNull();
    expect(element.querySelector('#cliente-carrito-validation-summary')).toBeNull();
  });
});
