import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog';

@Component({
  template: `
    <app-confirm-dialog title="Cambiar estado">
      <p class="consequence">Se cambiará el estado de Ana Gómez.</p>
    </app-confirm-dialog>
  `,
  imports: [ConfirmDialogComponent],
})
class HostComponent {}

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let element: HTMLElement;

  function render(): void {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Cambiar estado de vendedor');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();
  });

  it('renders the title and the default action labels', () => {
    render();

    expect(
      element.querySelector('.confirm-dialog__title')?.textContent?.trim(),
    ).toBe('Cambiar estado de vendedor');

    const [cancel, confirm] = element.querySelectorAll<HTMLButtonElement>('button');
    expect(cancel.textContent?.trim()).toBe('Cancelar');
    expect(confirm.textContent?.trim()).toBe('Confirmar');
  });

  it('exposes the dialog as an accessible modal', () => {
    render();

    const dialog = element.querySelector<HTMLElement>('.confirm-dialog');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
  });

  it('emits confirm when the confirm button is clicked', () => {
    render();
    let confirmed = false;
    component.confirm.subscribe(() => (confirmed = true));

    element.querySelector<HTMLButtonElement>('.confirm-dialog__button--confirm')!.click();

    expect(confirmed).toBeTrue();
  });

  it('emits cancel when the cancel button is clicked', () => {
    render();
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));

    element.querySelector<HTMLButtonElement>('.confirm-dialog__button--cancel')!.click();

    expect(cancelled).toBeTrue();
  });

  it('emits cancel when Escape is pressed', () => {
    render();
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelled).toBeTrue();
  });

  it('disables both buttons while loading', () => {
    render();
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const [cancel, confirm] = element.querySelectorAll<HTMLButtonElement>('button');
    expect(cancel.disabled).toBeTrue();
    expect(confirm.disabled).toBeTrue();
  });

  it('does not cancel on Escape while loading', () => {
    render();
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelled).toBeFalse();
  });

  it('projects body content into the dialog', () => {
    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();
    const hostElement = hostFixture.nativeElement as HTMLElement;

    expect(
      hostElement.querySelector('.confirm-dialog .consequence')?.textContent?.trim(),
    ).toBe('Se cambiará el estado de Ana Gómez.');
  });
});
