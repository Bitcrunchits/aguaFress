import {
  Component,
  ElementRef,
  HostListener,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';

const PRODUCT_IMAGE_SIZES = {
  THUMB: 'thumb',
  CARD: 'card',
} as const;

export type ProductImageSize =
  (typeof PRODUCT_IMAGE_SIZES)[keyof typeof PRODUCT_IMAGE_SIZES];

/**
 * Clickable product image with a lightbox preview. Renders the image inside a
 * reset button (sized `thumb` for table rows or `card` for catalog cards) and
 * opens a modal overlay with the same image enlarged on click. The overlay
 * closes on the close button, the Escape key, or a backdrop click; focus moves
 * to the close button on open and returns to the document on close.
 */
@Component({
  selector: 'app-product-image',
  templateUrl: './product-image.html',
  styleUrl: './product-image.scss',
})
export class ProductImageComponent {
  /** Absolute, already-resolved image URL. */
  readonly src = input.required<string>();

  /** Decorative alt text (empty by default). */
  readonly alt = input<string>('');

  /** Accessible name for the trigger button. */
  readonly ariaLabel = input<string>('Ver imagen');

  /** Visual size of the trigger: `thumb` (table) or `card` (catalog). */
  readonly size = input<ProductImageSize>(PRODUCT_IMAGE_SIZES.THUMB);

  /** Whether the lightbox overlay is open. */
  readonly isOpen = signal(false);

  private readonly closeButtonRef =
    viewChild<ElementRef<HTMLButtonElement>>('closePreviewButton');

  constructor() {
    // Move focus to the close button each time the lightbox opens. An effect
    // (rather than afterNextRender) keeps working when the component persists
    // across multiple opens: the viewChild query re-runs after the dialog
    // renders and the effect picks the fresh button up.
    effect(() => {
      if (this.isOpen()) {
        this.closeButtonRef()?.nativeElement.focus();
      }
    });
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
