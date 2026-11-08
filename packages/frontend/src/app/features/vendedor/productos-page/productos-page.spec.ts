import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { CategoriaResponse, MarcaResponse, PaginatedResponse, ProductResponse } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { VendedorCatalogoService } from '../vendedor-catalogo.service';
import { VendedorProductosService } from '../vendedor-productos.service';
import { VendedorProductosPage } from './productos-page';

const PRODUCT: ProductResponse = {
  id: 'producto-1',
  nombre: 'Agua mineral 500 ml',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 12,
  categoria: 'Agua',
  marca: 'Manantial',
  vendedorId: 'vendedor-1',
  activo: true,
  mostrarPrecio: true,
};

function pageResponse(
  items: ProductResponse[],
  page = 1,
  totalPages = 1,
): PaginatedResponse<ProductResponse> {
  return {
    data: items,
    pagination: { page, limit: 10, total: items.length, totalPages },
  };
}

const CATEGORIA: CategoriaResponse = {
  id: 'categoria-1',
  nombre: 'Agua',
  orden: 1,
  vendedorId: 'vendedor-1',
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MARCA: MarcaResponse = {
  id: 'marca-1',
  nombre: 'Manantial',
  vendedorId: 'vendedor-1',
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('VendedorProductosPage', () => {
  let fixture: ComponentFixture<VendedorProductosPage>;
  let component: VendedorProductosPage;
  let element: HTMLElement;
  let router: Router;

  const serviceStub = {
    list: jasmine.createSpy('list'),
    delete: jasmine.createSpy('delete'),
  };
  const catalogoServiceStub = {
    createCategoria: jasmine.createSpy('createCategoria'),
    createMarca: jasmine.createSpy('createMarca'),
  };

  beforeEach(async () => {
    serviceStub.list.calls.reset();
    serviceStub.delete.calls.reset();
    catalogoServiceStub.createCategoria.calls.reset();
    catalogoServiceStub.createMarca.calls.reset();

    await TestBed.configureTestingModule({
      imports: [VendedorProductosPage],
      providers: [
        provideRouter([]),
        { provide: VendedorProductosService, useValue: serviceStub },
        { provide: VendedorCatalogoService, useValue: catalogoServiceStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(VendedorProductosPage);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<PaginatedResponse<ProductResponse>> {
    return new Observable<PaginatedResponse<ProductResponse>>(() => {});
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
  }

  function openCategoriaForm(): void {
    findButton('Nueva categoría')?.click();
    fixture.detectChanges();
  }

  function setCategoriaNombre(value: string): void {
    const input = element.querySelector<HTMLInputElement>('#nueva-categoria-nombre');
    input!.value = value;
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function openMarcaForm(): void {
    findButton('Nueva marca')?.click();
    fixture.detectChanges();
  }

  function setMarcaNombre(value: string): void {
    const input = element.querySelector<HTMLInputElement>('#nueva-marca-nombre');
    input!.value = value;
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('shows the loading state while the list request is in flight', () => {
    serviceStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledWith(1, 10);
    expect(element.textContent).toContain('Cargando productos');
  });

  it('renders rows with contract data, badge and formatted price', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Agua mineral 500 ml');
    expect(element.textContent).toContain('Agua');
    expect(element.textContent).toContain('12');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain(component.formatPrice(1210));
  });

  it('renders an inactive badge for a soft-deleted product', () => {
    serviceStub.list.and.returnValue(of(pageResponse([{ ...PRODUCT, activo: false }])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Inactivo');
    expect(element.textContent).not.toContain('Activo');
  });

  it('shows the empty state when there are no products', () => {
    serviceStub.list.and.returnValue(of(pageResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay productos cargados todavía.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    serviceStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of(pageResponse([PRODUCT])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los productos');

    const retryButton = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Reintentar',
    );
    retryButton?.click();
    fixture.detectChanges();

    expect(serviceStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Agua mineral 500 ml');
  });

  it('paginates with Anterior and Siguiente', () => {
    serviceStub.list.and.returnValues(
      of(pageResponse([PRODUCT], 1, 2)),
      of(pageResponse([{ ...PRODUCT, id: 'producto-2' }], 2, 2)),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('Página 1 de 2');

    const buttons = element.querySelectorAll<HTMLButtonElement>('button');
    buttons[buttons.length - 1].click();
    fixture.detectChanges();

    expect(serviceStub.list.calls.mostRecent().args).toEqual([2, 10]);
    expect(element.textContent).toContain('Página 2 de 2');
  });

  it('navigates to the create form from the Nuevo producto button', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));

    fixture.detectChanges();

    const createButton = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Nuevo producto',
    );
    createButton?.click();

    expect(router.navigate).toHaveBeenCalledWith(['/vendedor/catalogo/productos/nuevo']);
  });

  it('navigates to the edit form from the Editar button', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));

    fixture.detectChanges();

    const editButton = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Editar',
    );
    editButton?.click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/vendedor/catalogo/productos',
      'producto-1',
      'editar',
    ]);
  });

  it('deactivates a product after confirmation and updates the row in place', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));
    serviceStub.delete.and.returnValue(of({ deleted: true }));

    fixture.detectChanges();

    const deactivateButton = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Desactivar',
    );
    expect(deactivateButton).toBeDefined();
    deactivateButton?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Desactivar producto');
    expect(element.textContent).toContain(
      'Se desactivará Agua mineral 500 ml. Dejará de mostrarse a tus clientes.',
    );

    const confirmButton = element.querySelector<HTMLButtonElement>(
      '.confirm-dialog__button--confirm',
    );
    confirmButton?.click();
    fixture.detectChanges();

    expect(serviceStub.delete).toHaveBeenCalledWith('producto-1');
    expect(element.textContent).toContain('Inactivo');
    expect(
      Array.from(element.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === 'Desactivar',
      ),
    ).toBeUndefined();
  });

  it('keeps the dialog open and the product active when deactivation fails', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));
    serviceStub.delete.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    const deactivateButton = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Desactivar',
    );
    deactivateButton?.click();
    fixture.detectChanges();

    const confirmButton = element.querySelector<HTMLButtonElement>(
      '.confirm-dialog__button--confirm',
    );
    confirmButton?.click();
    fixture.detectChanges();

    expect(serviceStub.delete).toHaveBeenCalledWith('producto-1');
    expect(element.textContent).toContain('No pudimos desactivar el producto');
    expect(element.textContent).toContain('Desactivar producto');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).not.toContain('Inactivo');
  });

  it('does not offer Desactivar for an already inactive product', () => {
    serviceStub.list.and.returnValue(of(pageResponse([{ ...PRODUCT, activo: false }])));

    fixture.detectChanges();

    expect(
      Array.from(element.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === 'Desactivar',
      ),
    ).toBeUndefined();
  });

  it('creates a categoria from the inline form and shows a success message', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));
    catalogoServiceStub.createCategoria.and.returnValue(of(CATEGORIA));

    fixture.detectChanges();
    openCategoriaForm();
    setCategoriaNombre('Agua');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).toHaveBeenCalledWith({ nombre: 'Agua' });
    expect(element.textContent).toContain('Categoría creada');
    expect(findButton('Nueva categoría')).toBeDefined();
  });

  it('validates the categoria name before creating', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));

    fixture.detectChanges();
    openCategoriaForm();
    setCategoriaNombre('A');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa un nombre de entre 2 y 255 caracteres.');
  });

  it('shows an error message when categoria creation fails', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));
    catalogoServiceStub.createCategoria.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    openCategoriaForm();
    setCategoriaNombre('Agua');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).toHaveBeenCalledWith({ nombre: 'Agua' });
    expect(element.textContent).toContain(
      'No pudimos crear la categoría. Inténtalo de nuevo en unos segundos.',
    );
  });

  it('creates a marca from the inline form and shows a success message', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));
    catalogoServiceStub.createMarca.and.returnValue(of(MARCA));

    fixture.detectChanges();
    openMarcaForm();
    setMarcaNombre('Manantial');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createMarca).toHaveBeenCalledWith({ nombre: 'Manantial' });
    expect(element.textContent).toContain('Marca creada');
    expect(findButton('Nueva marca')).toBeDefined();
  });

  it('validates the marca name before creating', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));

    fixture.detectChanges();
    openMarcaForm();
    setMarcaNombre('A');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createMarca).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa un nombre de entre 2 y 255 caracteres.');
  });

  it('shows an error message when marca creation fails', () => {
    serviceStub.list.and.returnValue(of(pageResponse([PRODUCT])));
    catalogoServiceStub.createMarca.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    openMarcaForm();
    setMarcaNombre('Manantial');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createMarca).toHaveBeenCalledWith({ nombre: 'Manantial' });
    expect(element.textContent).toContain(
      'No pudimos crear la marca. Inténtalo de nuevo en unos segundos.',
    );
  });
});
