import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PaginationResponse, ProductResponse } from '@agua/contracts';
import {
  ClienteCarritoFacade,
  ClienteCarritoFeedbackKind,
  type ClienteCarritoFeedback,
} from '../cliente-carrito.facade';
import { ClienteCatalogoFacade } from '../cliente-catalogo.facade';
import { ClienteCatalogoPage } from './cliente-catalogo-page';

const PRODUCT: ProductResponse = {
  id: 'producto-1',
  nombre: 'Agua mineral 500 ml',
  marca: 'Aguas del Sur',
  categoria: 'Bebidas',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 12,
  vendedorId: 'vendedor-1',
  activo: true,
};

describe('ClienteCatalogoPage', () => {
  let fixture: ComponentFixture<ClienteCatalogoPage>;
  let element: HTMLElement;

  const products = signal<ProductResponse[]>([]);
  const pagination = signal<PaginationResponse | null>(null);
  const page = signal(1);
  const query = signal('');
  const hasQuery = computed(() => query().trim().length > 0);
  const loading = signal(false);
  const failed = signal(false);
  const redirectToHome = signal(false);
  const cartRedirectToHome = signal(false);
  const addingProductId = signal<string | null>(null);
  const feedback = signal<ClienteCarritoFeedback | null>(null);
  const load = jasmine.createSpy('load');
  const retry = jasmine.createSpy('retry');
  const setQuery = jasmine.createSpy('setQuery');
  const previousPage = jasmine.createSpy('previousPage');
  const nextPage = jasmine.createSpy('nextPage');
  const addToCart = jasmine.createSpy('addToCart');

  beforeEach(async () => {
    products.set([]);
    pagination.set(null);
    page.set(1);
    query.set('');
    loading.set(false);
    failed.set(false);
    redirectToHome.set(false);
    cartRedirectToHome.set(false);
    addingProductId.set(null);
    feedback.set(null);
    load.calls.reset();
    retry.calls.reset();
    setQuery.calls.reset();
    previousPage.calls.reset();
    nextPage.calls.reset();
    addToCart.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ClienteCatalogoPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(ClienteCatalogoPage, {
        set: {
          providers: [
            {
              provide: ClienteCatalogoFacade,
              useValue: {
                products,
                pagination,
                page,
                query,
                hasQuery,
                loading,
                failed,
                redirectToHome,
                load,
                retry,
                setQuery,
                previousPage,
                nextPage,
              },
            },
            {
              provide: ClienteCarritoFacade,
              useValue: {
                addingProductId,
                feedback,
                redirectToHome: cartRedirectToHome,
                addToCart,
              },
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClienteCatalogoPage);
    element = fixture.nativeElement as HTMLElement;
  });

  it('loads on init and renders then clears the loading state', () => {
    loading.set(true);
    fixture.detectChanges();

    expect(load).toHaveBeenCalled();
    expect(element.textContent).toContain('Cargando productos');

    loading.set(false);
    products.set([PRODUCT]);
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Cargando productos');
    expect(element.textContent).toContain(PRODUCT.nombre);
  });

  it('renders the error state and forwards retry', () => {
    failed.set(true);
    fixture.detectChanges();

    expect(element.textContent).toContain('No pudimos cargar los productos');

    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Reintentar',
    );
    button?.click();

    expect(retry).toHaveBeenCalled();
  });

  it('renders the empty state', () => {
    fixture.detectChanges();

    expect(element.textContent).toContain('No hay productos disponibles');
  });

  it('renders products with name, price, stock, and metadata', () => {
    products.set([PRODUCT]);
    fixture.detectChanges();

    expect(element.textContent).toContain(PRODUCT.nombre);
    expect(element.textContent).toContain(PRODUCT.marca);
    expect(element.textContent).toContain(PRODUCT.categoria);
    expect(element.textContent).toContain('1.210');
    expect(element.textContent).toContain('Stock: 12');
    expect(element.textContent).not.toContain('No disponible');
  });

  it('renders the availability label for an unavailable product', () => {
    products.set([{ ...PRODUCT, stock: 0 }]);
    fixture.detectChanges();

    expect(element.textContent).toContain('No disponible');
  });

  it('renders a labeled search input and forwards typing to the facade', () => {
    fixture.detectChanges();

    const input = element.querySelector<HTMLInputElement>('#cliente-catalogo-search');
    const label = element.querySelector<HTMLLabelElement>('label[for="cliente-catalogo-search"]');

    expect(label?.textContent).toContain('Buscar productos');
    expect(input).not.toBeNull();
    if (input === null) {
      return;
    }

    input.value = 'agua';
    input.dispatchEvent(new Event('input'));

    expect(setQuery).toHaveBeenCalledWith('agua');
  });

  it('renders the page indicator and forwards pagination clicks', () => {
    products.set([PRODUCT]);
    page.set(1);
    pagination.set({ page: 1, limit: 20, total: 2, totalPages: 2 });
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 1 de 2');

    const previous = findButton('Anterior');
    const next = findButton('Siguiente');
    expect(previous?.disabled).toBeTrue();
    expect(next?.disabled).toBeFalse();

    next?.click();
    expect(nextPage).toHaveBeenCalled();

    page.set(2);
    fixture.detectChanges();

    expect(previous?.disabled).toBeFalse();
    expect(next?.disabled).toBeTrue();

    previous?.click();
    expect(previousPage).toHaveBeenCalled();
  });

  it('keeps pagination available when the page has no products', () => {
    page.set(2);
    pagination.set({ page: 2, limit: 20, total: 1, totalPages: 2 });
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');

    const previous = findButton('Anterior');
    const next = findButton('Siguiente');
    expect(previous?.disabled).toBeFalse();
    expect(next?.disabled).toBeTrue();

    previous?.click();
    expect(previousPage).toHaveBeenCalled();
  });

  it('disables the add action for unavailable products', () => {
    products.set([
      { ...PRODUCT, id: 'producto-inactivo', activo: false },
      { ...PRODUCT, id: 'producto-sin-stock', stock: 0 },
      { ...PRODUCT, id: 'producto-sin-precio', mostrarPrecio: false },
    ]);
    fixture.detectChanges();

    const buttons = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.cliente__add'),
    );
    expect(buttons.length).toBe(3);
    expect(buttons.every((button) => button.disabled)).toBeTrue();
  });

  it('forwards an add click and shows the success feedback in a polite live region', () => {
    products.set([PRODUCT]);
    fixture.detectChanges();

    const button = element.querySelector<HTMLButtonElement>('.cliente__add');
    expect(button?.disabled).toBeFalse();

    button?.click();
    expect(addToCart).toHaveBeenCalledWith(PRODUCT);

    feedback.set({ kind: ClienteCarritoFeedbackKind.Added, productId: PRODUCT.id });
    fixture.detectChanges();

    const region = element.querySelector<HTMLElement>('[aria-live="polite"]');
    expect(region?.textContent).toContain('Producto agregado al carrito');

    const product = element.querySelector<HTMLElement>('.cliente__product');
    expect(product?.getAttribute('aria-describedby')).toBe('cliente-catalogo-feedback');
  });

  it('marks the adding product busy', () => {
    products.set([PRODUCT, { ...PRODUCT, id: 'producto-2', nombre: 'Agua con gas' }]);
    addingProductId.set(PRODUCT.id);
    fixture.detectChanges();

    const buttons = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.cliente__add'),
    );
    expect(buttons[0]?.getAttribute('aria-busy')).toBe('true');
    expect(buttons[0]?.textContent).toContain('Agregando');
    expect(buttons[1]?.getAttribute('aria-busy')).toBe('false');
  });

  it('shows the mapped Spanish feedback for add errors', () => {
    feedback.set({ kind: ClienteCarritoFeedbackKind.Forbidden, productId: PRODUCT.id });
    fixture.detectChanges();
    expect(element.textContent).toContain('No tenes permiso para agregar este producto');

    feedback.set({ kind: ClienteCarritoFeedbackKind.OutOfStock, productId: PRODUCT.id });
    fixture.detectChanges();
    expect(element.textContent).toContain('Producto sin stock o no disponible');

    feedback.set({ kind: ClienteCarritoFeedbackKind.Network, productId: PRODUCT.id });
    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos conectar con el servidor');
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(
      element.querySelectorAll<HTMLButtonElement>('.cliente__pagination button'),
    ).find((candidate) => candidate.textContent?.trim() === label);
  }
});
