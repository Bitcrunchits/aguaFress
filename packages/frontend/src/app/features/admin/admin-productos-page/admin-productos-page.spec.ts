import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  PaginatedResponse,
  ProductResponse,
  SuperAdminVendedorItem,
  SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { VendedorEstado } from '@agua/contracts';
import { Observable, of, throwError } from 'rxjs';
import { AdminProductosService } from '../admin-productos.service';
import { AdminVendedoresService } from '../admin-vendedores.service';
import { AdminProductosPage } from './admin-productos-page';

const PRODUCT: ProductResponse = {
  id: 'producto-1',
  nombre: 'Bidón 20L',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 5,
  marca: 'Aguas del Sur',
  categoria: 'Bidones',
  vendedorId: 'vendedor-1',
  activo: true,
  mostrarPrecio: true,
};

const VENDEDOR: SuperAdminVendedorItem = {
  id: 'vendedor-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  email: 'ana@example.com',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
  clientesCount: 3,
  fechaRegistro: '2026-01-15T12:00:00.000Z',
};

function productResponse(
  items: ProductResponse[],
  page = 1,
  totalPages = 1,
): PaginatedResponse<ProductResponse> {
  return {
    data: items,
    pagination: { page, limit: 20, total: items.length, totalPages },
  };
}

function vendedorResponse(items: SuperAdminVendedorItem[]): SuperAdminVendedorListResponse {
  return {
    data: items,
    pagination: { page: 1, limit: 100, total: items.length, totalPages: 1 },
  };
}

describe('AdminProductosPage', () => {
  let fixture: ComponentFixture<AdminProductosPage>;
  let element: HTMLElement;
  const productosStub = { list: jasmine.createSpy('list') };
  const vendedoresStub = { list: jasmine.createSpy('list') };

  beforeEach(async () => {
    productosStub.list.calls.reset();
    vendedoresStub.list.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AdminProductosPage],
      providers: [
        { provide: AdminProductosService, useValue: productosStub },
        { provide: AdminVendedoresService, useValue: vendedoresStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductosPage);
    element = fixture.nativeElement as HTMLElement;
  });

  function pendingList(): Observable<PaginatedResponse<ProductResponse>> {
    return new Observable<PaginatedResponse<ProductResponse>>(() => {});
  }

  it('loads the vendors selector and the products list on init', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([VENDEDOR])));
    productosStub.list.and.returnValue(of(productResponse([PRODUCT])));

    fixture.detectChanges();

    expect(vendedoresStub.list).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(productosStub.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(element.textContent).toContain('Aguas del Sur · Ana Gómez');
  });

  it('shows the loading state while the products request is in flight', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(pendingList());

    fixture.detectChanges();

    expect(element.textContent).toContain('Cargando productos');
  });

  it('renders product rows with price, stock, estado, categoria and marca', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([VENDEDOR])));
    productosStub.list.and.returnValue(of(productResponse([PRODUCT])));

    fixture.detectChanges();

    expect(element.textContent).toContain('Bidón 20L');
    expect(element.textContent).toContain('1.210');
    expect(element.textContent).toContain('5');
    expect(element.textContent).toContain('Activo');
    expect(element.textContent).toContain('Bidones');
    expect(element.textContent).toContain('Aguas del Sur');
  });

  it('shows the empty state when there are no products', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(of(productResponse([])));

    fixture.detectChanges();

    expect(element.textContent).toContain('No hay productos para mostrar.');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows the error state and reloads on retry', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValues(
      throwError(() => new Error('boom')),
      of(productResponse([PRODUCT])),
    );

    fixture.detectChanges();
    expect(element.textContent).toContain('No pudimos cargar los productos');

    element.querySelector<HTMLButtonElement>('.productos__state--error button')?.click();
    fixture.detectChanges();

    expect(productosStub.list).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Bidón 20L');
  });

  it('filters the products by the selected vendedor', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([VENDEDOR])));
    productosStub.list.and.returnValue(of(productResponse([PRODUCT])));

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#productos-vendedor')!;
    select.value = 'vendedor-1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(productosStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, vendedorId: 'vendedor-1' },
    ]);
  });

  it('lists every product when the Todos option is selected', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([VENDEDOR])));
    productosStub.list.and.returnValue(of(productResponse([PRODUCT])));

    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('#productos-vendedor')!;
    select.value = 'vendedor-1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(productosStub.list.calls.mostRecent().args).toEqual([
      { page: 1, limit: 20, vendedorId: 'vendedor-1' },
    ]);

    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(productosStub.list.calls.mostRecent().args).toEqual([{ page: 1, limit: 20 }]);
  });

  it('disables Anterior and Siguiente at the pagination bounds', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValues(
      of(productResponse([PRODUCT], 1, 2)),
      of(productResponse([{ ...PRODUCT, id: 'producto-2' }], 2, 2)),
    );

    fixture.detectChanges();

    let [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.productos__pagination button',
    );
    expect(element.textContent).toContain('Página 1 de 2');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();

    expect(productosStub.list.calls.mostRecent().args).toEqual([{ page: 2, limit: 20 }]);
    [previous, next] = element.querySelectorAll<HTMLButtonElement>(
      '.productos__pagination button',
    );
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeTrue();
  });

  it('renders a thumbnail pointing at the upload URL when the product has an image', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(
      of(productResponse([{ ...PRODUCT, imagen: 'products/agua-500.webp' }])),
    );

    fixture.detectChanges();

    const thumb = element.querySelector<HTMLImageElement>('img.productos__thumb');
    expect(thumb).not.toBeNull();
    expect(thumb?.getAttribute('src')).toContain('/uploads/products/agua-500.webp');
  });

  it('omits the thumbnail button and image when the product has no image', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(of(productResponse([PRODUCT])));

    fixture.detectChanges();

    expect(element.querySelector('.productos__thumb-btn')).toBeNull();
    expect(element.querySelector('img.productos__thumb')).toBeNull();
  });

  it('opens the lightbox with the product image when the thumbnail is clicked', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(
      of(productResponse([{ ...PRODUCT, imagen: 'products/agua-500.webp' }])),
    );

    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.productos__thumb-btn')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.productos__lightbox')).not.toBeNull();
    expect(
      element
        .querySelector<HTMLImageElement>('img.productos__lightbox__image')
        ?.getAttribute('src'),
    ).toContain('/uploads/products/agua-500.webp');
  });

  it('closes the lightbox when the close button is clicked', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(
      of(productResponse([{ ...PRODUCT, imagen: 'products/agua-500.webp' }])),
    );

    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.productos__thumb-btn')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.productos__lightbox')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.productos__lightbox__close')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.productos__lightbox')).toBeNull();
  });

  it('closes the lightbox when Escape is pressed', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(
      of(productResponse([{ ...PRODUCT, imagen: 'products/agua-500.webp' }])),
    );

    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.productos__thumb-btn')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.productos__lightbox')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(element.querySelector('.productos__lightbox')).toBeNull();
  });

  it('closes the lightbox when the backdrop is clicked', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(
      of(productResponse([{ ...PRODUCT, imagen: 'products/agua-500.webp' }])),
    );

    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.productos__thumb-btn')!.click();
    fixture.detectChanges();

    element.querySelector<HTMLElement>('.productos__lightbox')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.productos__lightbox')).toBeNull();
  });

  it('keeps the lightbox open when the image itself is clicked', () => {
    vendedoresStub.list.and.returnValue(of(vendedorResponse([])));
    productosStub.list.and.returnValue(
      of(productResponse([{ ...PRODUCT, imagen: 'products/agua-500.webp' }])),
    );

    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.productos__thumb-btn')!.click();
    fixture.detectChanges();

    element.querySelector<HTMLElement>('.productos__lightbox__image')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.productos__lightbox')).not.toBeNull();
  });
});
