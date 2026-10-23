import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProductResponse } from '@agua/contracts';
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
  const loading = signal(false);
  const failed = signal(false);
  const redirectToHome = signal(false);
  const load = jasmine.createSpy('load');
  const retry = jasmine.createSpy('retry');

  beforeEach(async () => {
    products.set([]);
    loading.set(false);
    failed.set(false);
    redirectToHome.set(false);
    load.calls.reset();
    retry.calls.reset();

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
                loading,
                failed,
                redirectToHome,
                load,
                retry,
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
});
