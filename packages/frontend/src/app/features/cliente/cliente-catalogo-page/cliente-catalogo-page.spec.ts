import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PaginationResponse, ProductResponse } from '@agua/contracts';
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
  const load = jasmine.createSpy('load');
  const retry = jasmine.createSpy('retry');
  const setQuery = jasmine.createSpy('setQuery');
  const previousPage = jasmine.createSpy('previousPage');
  const nextPage = jasmine.createSpy('nextPage');

  beforeEach(async () => {
    products.set([]);
    pagination.set(null);
    page.set(1);
    query.set('');
    loading.set(false);
    failed.set(false);
    redirectToHome.set(false);
    load.calls.reset();
    retry.calls.reset();
    setQuery.calls.reset();
    previousPage.calls.reset();
    nextPage.calls.reset();

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

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(
      element.querySelectorAll<HTMLButtonElement>('.cliente__pagination button'),
    ).find((candidate) => candidate.textContent?.trim() === label);
  }
});
