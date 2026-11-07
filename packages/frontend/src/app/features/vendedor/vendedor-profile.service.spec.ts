import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VendedorEstado } from '@agua/contracts';
import type { VendedorProfile } from '@agua/contracts';
import { VendedorProfileService } from './vendedor-profile.service';

const BASE = 'https://api-aguafress.eadev.cloud';

const PROFILE: VendedorProfile = {
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  estado: VendedorEstado.ACTIVO,
  ciudadDefault: 'Córdoba',
  zonaEntrega: 'Norte',
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
    let response: VendedorProfile | undefined;

    service.getProfile().subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/vendedores/profile`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.get('vendedorId')).toBeNull();
    expect(request.request.params.get('userId')).toBeNull();

    request.flush(PROFILE);
    expect(response).toEqual(PROFILE);
  });
});
