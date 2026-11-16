import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductImageComponent } from './product-image';

const SRC = '/uploads/products/agua-500.webp';

describe('ProductImageComponent', () => {
  let fixture: ComponentFixture<ProductImageComponent>;
  let element: HTMLElement;

  function render(inputs: { alt?: string; ariaLabel?: string; size?: 'thumb' | 'card' } = {}): void {
    fixture = TestBed.createComponent(ProductImageComponent);
    fixture.componentRef.setInput('src', SRC);
    if (inputs.alt !== undefined) {
      fixture.componentRef.setInput('alt', inputs.alt);
    }
    if (inputs.ariaLabel !== undefined) {
      fixture.componentRef.setInput('ariaLabel', inputs.ariaLabel);
    }
    if (inputs.size !== undefined) {
      fixture.componentRef.setInput('size', inputs.size);
    }
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  function openLightbox(): void {
    element.querySelector<HTMLButtonElement>('.product-image__btn')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductImageComponent],
    }).compileComponents();
  });

  it('renders a button wrapping an image with the resolved source', () => {
    render();

    const button = element.querySelector<HTMLButtonElement>('.product-image__btn');
    const img = element.querySelector<HTMLImageElement>('.product-image__img');

    expect(button).not.toBeNull();
    expect(button?.getAttribute('type')).toBe('button');
    expect(img?.getAttribute('src')).toBe(SRC);
  });

  it('applies the thumb size by default and the card size when requested', () => {
    render();

    const button = element.querySelector<HTMLButtonElement>('.product-image__btn')!;
    expect(button.classList).toContain('product-image__btn--thumb');

    fixture.componentRef.setInput('size', 'card');
    fixture.detectChanges();

    expect(button.classList).toContain('product-image__btn--card');
    expect(button.classList).not.toContain('product-image__btn--thumb');
  });

  it('uses the provided aria-label as the button accessible name', () => {
    render({ ariaLabel: 'Ver imagen de Bidón 20L' });

    expect(
      element.querySelector<HTMLButtonElement>('.product-image__btn')?.getAttribute('aria-label'),
    ).toBe('Ver imagen de Bidón 20L');
  });

  it('opens the lightbox with the image source when clicked', () => {
    render();

    openLightbox();

    const lightbox = element.querySelector<HTMLElement>('.product-image__lightbox');
    expect(lightbox).not.toBeNull();
    expect(lightbox?.getAttribute('role')).toBe('dialog');
    expect(lightbox?.getAttribute('aria-modal')).toBe('true');
    expect(lightbox?.getAttribute('aria-label')).toBe('Vista previa');
    expect(
      element
        .querySelector<HTMLImageElement>('.product-image__lightbox__image')
        ?.getAttribute('src'),
    ).toBe(SRC);
  });

  it('closes the lightbox when the close button is clicked', () => {
    render();
    openLightbox();
    expect(element.querySelector('.product-image__lightbox')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.product-image__lightbox__close')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.product-image__lightbox')).toBeNull();
  });

  it('closes the lightbox when Escape is pressed', () => {
    render();
    openLightbox();
    expect(element.querySelector('.product-image__lightbox')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(element.querySelector('.product-image__lightbox')).toBeNull();
  });

  it('closes the lightbox when the backdrop is clicked', () => {
    render();
    openLightbox();

    element.querySelector<HTMLElement>('.product-image__lightbox')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.product-image__lightbox')).toBeNull();
  });

  it('keeps the lightbox open when the image itself is clicked', () => {
    render();
    openLightbox();

    element.querySelector<HTMLElement>('.product-image__lightbox__image')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.product-image__lightbox')).not.toBeNull();
  });
});
