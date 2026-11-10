import {
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Generic, accessible confirmation dialog.
 *
 * The caller supplies a title and projects the body (via `<ng-content>`) so
 * the consequence — entity name, target value, transition — can be named
 * explicitly. It owns no business logic: it only emits `confirm`/`cancel`.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly loading = input(false);
  readonly confirmDisabled = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Move focus into the dialog as soon as it renders. The instance is
    // created fresh on each open (the host renders it behind `@if`), so this
    // runs once per open.
    afterNextRender(() => {
      this.dialogRef()?.nativeElement.focus();
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.loading()) {
      return;
    }
    event.preventDefault();
    this.cancel.emit();
  }
}
