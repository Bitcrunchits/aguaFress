import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CategoriaResponse, PaginatedResponse, ProductResponse } from '@agua/contracts';
import { Observable, Subject, of, throwError } from 'rxjs';
import { VendedorProductosService } from '../vendedor-productos.service';
import { VendedorProductosPage } from './vendedor-productos-page';

const PRODUCTO: ProductResponse = {
  id: 'prod-1',
  nombre: 'Bidón 20 L',
  descripcion: 'Retornable',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 5,
  categoria: 'Agua',
  vendedorId: 'vendedor-1',
  activo: true,
  mostrarPrecio: true,
};

const CATEGORIA: CategoriaResponse = {
  id: '6f1c2b8e-7a4d-4c1e-9b2a-1d3e5f7a9b0c',
  nombre: 'Agua',
  orden: 1,
  vendedorId: 'vendedor-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function pageOf(items: ProductResponse[], page = 1, totalPages = 1): PaginatedResponse<ProductResponse> {
  return { data: items, pagination: { page, limit: 10, total: items.length, totalPages } };
}

describe('VendedorProductosPage', () => {
  let fixture: ComponentFixture<VendedorProductosPage>;
  let element: HTMLElement;
  const service = {
    list: jasmine.createSpy('list'),
    get: jasmine.createSpy('get'),
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
    deactivate: jasmine.createSpy('deactivate'),
    listCategorias: jasmine.createSpy('listCategorias'),
  };

  beforeEach(async () => {
    Object.values(service).forEach((spy) => spy.calls.reset());
    service.listCategorias.and.returnValue(of([CATEGORIA]));

    await TestBed.configureTestingModule({
      imports: [VendedorProductosPage],
      providers: [provideRouter([]), { provide: VendedorProductosService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorProductosPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function buttonByText(text: string): HTMLButtonElement {
    const button = Array.from(element.querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === text || item.getAttribute('aria-label') === text,
    );
    if (button === undefined) {
      throw new Error(`Button "${text}" not found`);
    }
    return button;
  }

  function setInput(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
    if (input === null) {
      throw new Error(`Input "${selector}" not found`);
    }
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  function submitForm(): void {
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows the loading state while the list is in flight', () => {
    service.list.and.returnValue(new Observable<never>(() => {}));

    fixture.detectChanges();

    expect(service.list).toHaveBeenCalledWith(1, 10);
    expect(element.textContent).toContain('Cargando productos');
  });

  it('renders own products with Spanish estado labels', () => {
    service.list.and.returnValue(of(pageOf([PRODUCTO, { ...PRODUCTO, id: 'prod-2', nombre: 'Soda', activo: false }])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Bidón 20 L');
    expect(element.textContent).toContain('Soda');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain('Inactivo');
    // Inactive products cannot be deactivated again.
    expect(element.querySelectorAll('button[aria-label^="Desactivar"]').length).toBe(1);
  });

  it('shows the empty state when the vendedor has no products', () => {
    service.list.and.returnValue(of(pageOf([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Todavía no cargaste productos');
  });

  it('shows an error with retry when the list fails', () => {
    service.list.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(pageOf([PRODUCTO])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos conectar con el servidor');

    buttonByText('Reintentar').click();
    fixture.detectChanges();

    expect(service.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Bidón 20 L');
  });

  it('shows validation errors and does not call create with an invalid form', () => {
    service.list.and.returnValue(of(pageOf([])));
    fixture.detectChanges();

    buttonByText('Nuevo producto').click();
    fixture.detectChanges();
    submitForm();

    expect(service.create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa un nombre de al menos 2 caracteres.');
    expect(element.textContent).toContain('Ingresa un precio mayor a 0');
    expect(element.textContent).toContain('Selecciona una categoría.');
  });

  it('creates a product once, prevents double submit and reloads the list', () => {
    const createResult = new Subject<ProductResponse>();
    service.list.and.returnValues(of(pageOf([])), of(pageOf([PRODUCTO])));
    service.create.and.returnValue(createResult.asObservable());
    fixture.detectChanges();

    buttonByText('Nuevo producto').click();
    fixture.detectChanges();
    setInput('#producto-nombre', '  Bidón 20 L  ');
    setInput('#producto-precio', '1000');
    setInput('#producto-stock', '5');
    setInput('#producto-categoria', CATEGORIA.id);
    fixture.detectChanges();

    submitForm();
    submitForm();

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith({
      nombre: 'Bidón 20 L',
      precioSinIva: 1000,
      porcentajeIva: 21,
      stock: 5,
      categoriaId: CATEGORIA.id,
      mostrarPrecio: true,
    });
    expect(element.textContent).toContain('Guardando…');

    createResult.next(PRODUCTO);
    createResult.complete();
    fixture.detectChanges();

    expect(service.list).toHaveBeenCalledTimes(2);
    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).toContain('Creamos "Bidón 20 L".');
    expect(element.textContent).toContain('Bidón 20 L');
  });

  it('keeps the form open with feedback when create fails', () => {
    service.list.and.returnValue(of(pageOf([])));
    service.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture.detectChanges();

    buttonByText('Nuevo producto').click();
    fixture.detectChanges();
    setInput('#producto-nombre', 'Soda');
    setInput('#producto-precio', '500');
    setInput('#producto-stock', '3');
    setInput('#producto-categoria', CATEGORIA.id);
    submitForm();

    expect(element.querySelector('form')).not.toBeNull();
    expect(element.textContent).toContain('Tu cuenta todavía no puede modificar productos');
  });

  it('edits a product loaded with get and sends the update', () => {
    service.list.and.returnValues(of(pageOf([PRODUCTO])), of(pageOf([{ ...PRODUCTO, stock: 9 }])));
    service.get.and.returnValue(of(PRODUCTO));
    service.update.and.returnValue(of({ ...PRODUCTO, stock: 9 }));
    fixture.detectChanges();

    buttonByText('Editar Bidón 20 L').click();
    fixture.detectChanges();
    // Let the form's prefill effect run after it is first rendered.
    fixture.detectChanges();

    expect(service.get).toHaveBeenCalledWith('prod-1');
    const nombre = element.querySelector<HTMLInputElement>('#producto-nombre');
    expect(nombre?.value).toBe('Bidón 20 L');
    const categoria = element.querySelector<HTMLSelectElement>('#producto-categoria');
    expect(categoria?.value).toBe(CATEGORIA.id);

    setInput('#producto-stock', '9');
    submitForm();

    expect(service.update).toHaveBeenCalledWith('prod-1', {
      nombre: 'Bidón 20 L',
      precioSinIva: 1000,
      porcentajeIva: 21,
      stock: 9,
      categoriaId: CATEGORIA.id,
      mostrarPrecio: true,
      descripcion: 'Retornable',
    });
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Guardamos los cambios de "Bidón 20 L".');
  });

  it('asks for confirmation before deactivating and reloads afterwards', () => {
    service.list.and.returnValues(of(pageOf([PRODUCTO])), of(pageOf([{ ...PRODUCTO, activo: false }])));
    service.deactivate.and.returnValue(of(undefined));
    fixture.detectChanges();

    buttonByText('Desactivar Bidón 20 L').click();
    fixture.detectChanges();

    expect(service.deactivate).not.toHaveBeenCalled();
    expect(element.textContent).toContain('¿Desactivar "Bidón 20 L"?');

    buttonByText('Sí, desactivar').click();
    fixture.detectChanges();

    expect(service.deactivate).toHaveBeenCalledOnceWith('prod-1');
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Desactivamos "Bidón 20 L".');
    expect(element.textContent).toContain('Inactivo');
  });

  it('cancels the deactivation without calling the service', () => {
    service.list.and.returnValue(of(pageOf([PRODUCTO])));
    fixture.detectChanges();

    buttonByText('Desactivar Bidón 20 L').click();
    fixture.detectChanges();
    buttonByText('Cancelar').click();
    fixture.detectChanges();

    expect(service.deactivate).not.toHaveBeenCalled();
    expect(element.textContent).not.toContain('¿Desactivar');
  });
});
