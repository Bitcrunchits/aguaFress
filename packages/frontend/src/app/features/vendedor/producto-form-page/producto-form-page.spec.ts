import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import type { CategoriaResponse, MarcaResponse, ProductResponse } from '@agua/contracts';
import { of, throwError } from 'rxjs';
import { VendedorCatalogoService } from '../vendedor-catalogo.service';
import { VendedorProductosService } from '../vendedor-productos.service';
import { VendedorProductoFormPage } from './producto-form-page';

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

const NUEVA_CATEGORIA: CategoriaResponse = {
  id: 'categoria-2',
  nombre: 'Agua saborizada',
  orden: 2,
  vendedorId: 'vendedor-1',
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

describe('VendedorProductoFormPage', () => {
  let fixture: ComponentFixture<VendedorProductoFormPage>;
  let component: VendedorProductoFormPage;
  let element: HTMLElement;
  let router: Router;

  const catalogoServiceStub = {
    listCategorias: jasmine.createSpy('listCategorias'),
    listMarcas: jasmine.createSpy('listMarcas'),
    createCategoria: jasmine.createSpy('createCategoria'),
  };
  const productosServiceStub = {
    get: jasmine.createSpy('get'),
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
  };

  async function configure(routeId: string | null): Promise<void> {
    catalogoServiceStub.listCategorias.calls.reset();
    catalogoServiceStub.listMarcas.calls.reset();
    catalogoServiceStub.createCategoria.calls.reset();
    productosServiceStub.get.calls.reset();
    productosServiceStub.create.calls.reset();
    productosServiceStub.update.calls.reset();

    await TestBed.configureTestingModule({
      imports: [VendedorProductoFormPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(routeId === null ? {} : { id: routeId }) },
            paramMap: of(convertToParamMap(routeId === null ? {} : { id: routeId })),
          },
        },
        { provide: VendedorCatalogoService, useValue: catalogoServiceStub },
        { provide: VendedorProductosService, useValue: productosServiceStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(VendedorProductoFormPage);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  }

  function renderWithLookups(): void {
    catalogoServiceStub.listCategorias.and.returnValue(of([CATEGORIA]));
    catalogoServiceStub.listMarcas.and.returnValue(of([MARCA]));
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    component.form.setValue({
      nombre: 'Agua mineral',
      descripcion: '',
      precioSinIva: 1000,
      porcentajeIva: 21,
      porcentajeImpuestos: 0,
      stock: 12,
      categoriaId: 'categoria-1',
      marcaId: '',
      mostrarPrecio: true,
    });
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
  }

  function setCategoriaNombre(value: string): void {
    const input = element.querySelector<HTMLInputElement>('#nueva-categoria-nombre');
    input!.value = value;
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders the create form and submits a body without vendedorId', async () => {
    await configure(null);
    productosServiceStub.create.and.returnValue(of({ id: 'producto-1', created: true }));
    renderWithLookups();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Nuevo producto');
    expect(productosServiceStub.get).not.toHaveBeenCalled();

    fillValidForm();
    component.submit();

    expect(productosServiceStub.create).toHaveBeenCalledWith({
      nombre: 'Agua mineral',
      precioSinIva: 1000,
      stock: 12,
      categoriaId: 'categoria-1',
      mostrarPrecio: true,
      porcentajeIva: 21,
      porcentajeImpuestos: 0,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/vendedor/catalogo/productos']);
  });

  it('prefills the form in edit mode and submits an update', async () => {
    await configure('producto-1');
    productosServiceStub.get.and.returnValue(of(PRODUCT));
    productosServiceStub.update.and.returnValue(of({ id: 'producto-1', updated: true }));
    renderWithLookups();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Editar producto');
    expect(productosServiceStub.get).toHaveBeenCalledWith('producto-1');
    expect(component.form.get('categoriaId')?.value).toBe('categoria-1');
    expect(component.form.get('marcaId')?.value).toBe('marca-1');
    expect(component.form.get('nombre')?.value).toBe('Agua mineral 500 ml');

    component.submit();

    expect(productosServiceStub.update).toHaveBeenCalledWith('producto-1', {
      nombre: 'Agua mineral 500 ml',
      precioSinIva: 1000,
      stock: 12,
      categoriaId: 'categoria-1',
      mostrarPrecio: true,
      porcentajeIva: 21,
      porcentajeImpuestos: 0,
      marcaId: 'marca-1',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/vendedor/catalogo/productos']);
  });

  it('shows an empty state when there are no categories', async () => {
    await configure(null);
    catalogoServiceStub.listCategorias.and.returnValue(of([]));
    catalogoServiceStub.listMarcas.and.returnValue(of([]));
    fixture.detectChanges();

    expect(element.textContent).toContain('No tienes categorías creadas todavía.');
    expect(element.querySelector('form')).toBeNull();
  });

  it('does not submit an invalid form', async () => {
    await configure(null);
    renderWithLookups();

    component.submit();

    expect(productosServiceStub.create).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows a submit error without navigating when the request fails', async () => {
    await configure(null);
    productosServiceStub.create.and.returnValue(throwError(() => new Error('boom')));
    renderWithLookups();

    fillValidForm();
    component.submit();
    fixture.detectChanges();

    expect(element.textContent).toContain(
      'No pudimos guardar el producto. Inténtalo de nuevo en unos segundos.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('creates a categoria inline and auto-selects it in the form', async () => {
    await configure(null);
    catalogoServiceStub.createCategoria.and.returnValue(of(NUEVA_CATEGORIA));
    renderWithLookups();

    findButton('Nueva categoría')?.click();
    fixture.detectChanges();
    setCategoriaNombre('Agua saborizada');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).toHaveBeenCalledWith({
      nombre: 'Agua saborizada',
    });
    expect(component.categorias().some((categoria) => categoria.id === 'categoria-2')).toBeTrue();
    expect(component.form.get('categoriaId')?.value).toBe('categoria-2');
    expect(element.textContent).toContain('Categoría creada');
  });

  it('creates the first categoria from the empty state and reveals the form', async () => {
    await configure(null);
    catalogoServiceStub.listCategorias.and.returnValue(of([]));
    catalogoServiceStub.listMarcas.and.returnValue(of([]));
    catalogoServiceStub.createCategoria.and.returnValue(of(NUEVA_CATEGORIA));
    fixture.detectChanges();

    expect(element.textContent).toContain('No tienes categorías creadas todavía.');
    expect(element.querySelector('form')).toBeNull();

    findButton('Nueva categoría')?.click();
    fixture.detectChanges();
    setCategoriaNombre('Agua saborizada');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).toHaveBeenCalledWith({
      nombre: 'Agua saborizada',
    });
    expect(component.categorias().length).toBe(1);
    expect(component.form.get('categoriaId')?.value).toBe('categoria-2');
    expect(element.querySelector('form')).not.toBeNull();
  });

  it('validates the new categoria name without calling the service', async () => {
    await configure(null);
    renderWithLookups();

    findButton('Nueva categoría')?.click();
    fixture.detectChanges();
    setCategoriaNombre('A');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa un nombre de entre 2 y 255 caracteres.');
  });

  it('shows an error message when categoria creation fails', async () => {
    await configure(null);
    catalogoServiceStub.createCategoria.and.returnValue(throwError(() => new Error('boom')));
    renderWithLookups();

    findButton('Nueva categoría')?.click();
    fixture.detectChanges();
    setCategoriaNombre('Agua saborizada');

    findButton('Crear')?.click();
    fixture.detectChanges();

    expect(catalogoServiceStub.createCategoria).toHaveBeenCalledWith({
      nombre: 'Agua saborizada',
    });
    expect(element.textContent).toContain(
      'No pudimos crear la categoría. Inténtalo de nuevo en unos segundos.',
    );
  });
});
