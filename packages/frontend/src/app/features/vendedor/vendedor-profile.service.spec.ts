import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VendedorEstado } from '@agua/contracts';
import type { VendedorProfileV2DTO } from '@agua/contracts';
import {
  VendedorProfileService,
  type UpdateVendedorProfileRequest,
} from './vendedor-profile.service';

const BASE = 'https://api-aguafress.eadev.cloud';

const PROFILE: VendedorProfileV2DTO = {
  nombre: 'Ana',
  apellido: 'Gómez',
  dni: '12345678',
  cuil: '20-12345678-3',
  cuit: '30-12345678-3',
  telefono: '351123456',
  empresa: 'Aguas del Sur',
  logo: undefined,
  estado: VendedorEstado.ACTIVO,
  qrCode: 'qr-abc',
  ciudadDefault: 'Córdoba',
  zonaEntrega: 'Norte',
};

const RAW_PROFILE = {
  id: 'vendedor-1',
  auth_user_id: 'auth-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  dni: '12345678',
  cuil: '20-12345678-3',
  cuit: '30-12345678-3',
  telefono: '351123456',
  empresa: 'Aguas del Sur',
  logo: null,
  estado: 'activo',
  ciudad_default: 'Córdoba',
  zona_entrega: 'Norte',
  qr_token: 'qr-abc',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  auth_user: { id: 'auth-1', email: 'ana@example.com', role: 'vendedor', is_active: true },
  _count: { clientes: 0 },
};

describe('VendedorProfileService', () => {
  let service: VendedorProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the vendedor profile without sending vendedorId or userId', () => {
    let response: VendedorProfileV2DTO | undefined;

    service.getProfile().subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/vendedores/profile`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.get('vendedorId')).toBeNull();
    expect(request.request.params.get('userId')).toBeNull();

    request.flush(RAW_PROFILE);
    expect(response).toEqual(PROFILE);
  });

  it('maps the raw snake_case row into the camelCase VendedorProfile read model', () => {
    let response: VendedorProfileV2DTO | undefined;

    service.getProfile().subscribe((value) => (response = value));

    httpMock.expectOne(`${BASE}/api/v1/vendedores/profile`).flush(RAW_PROFILE);

    expect(response).toEqual(PROFILE);
  });

  it('collapses empty-string and null optionals to undefined', () => {
    let response: VendedorProfileV2DTO | undefined;

    service.getProfile().subscribe((value) => (response = value));

    httpMock
      .expectOne(`${BASE}/api/v1/vendedores/profile`)
      .flush({
        ...RAW_PROFILE,
        apellido: '',
        dni: '',
        telefono: '',
        cuil: null,
        cuit: null,
        empresa: null,
        logo: null,
        ciudad_default: '',
        zona_entrega: null,
        qr_token: null,
      });

    expect(response).toEqual({
      nombre: 'Ana',
      apellido: undefined,
      dni: undefined,
      cuil: undefined,
      cuit: undefined,
      telefono: undefined,
      empresa: undefined,
      logo: undefined,
      estado: VendedorEstado.ACTIVO,
      qrCode: undefined,
      ciudadDefault: undefined,
      zonaEntrega: undefined,
    });
  });

  it('updates the profile with a camelCase body and maps the raw response back', () => {
    const body: UpdateVendedorProfileRequest = {
      nombre: 'Ana María',
      telefono: '351000000',
      ciudadDefault: 'Córdoba',
      zonaEntrega: 'Norte',
    };
    let response: VendedorProfileV2DTO | undefined;

    service.updateProfile(body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/vendedores/profile/update`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    const sent = request.request.body as Record<string, unknown>;
    expect(sent['vendedorId']).toBeUndefined();
    expect(sent['userId']).toBeUndefined();
    expect(sent['estado']).toBeUndefined();
    expect(sent['qrToken']).toBeUndefined();

    request.flush({ ...RAW_PROFILE, nombre: 'Ana María', telefono: '351000000' });
    expect(response?.nombre).toBe('Ana María');
    expect(response?.telefono).toBe('351000000');
  });

  it('uploads a logo as multipart with a `file` field and returns the built URL', () => {
    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    let response: string | undefined;

    service.uploadLogo(file).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/upload/vendor-logo`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Content-Type')).toBeNull();
    const body = request.request.body as FormData;
    expect(body.get('file')).toBe(file);

    request.flush({ imageId: 'logos/abc123.webp' });
    expect(response).toBe('/uploads/logos/abc123.webp');
  });
});
