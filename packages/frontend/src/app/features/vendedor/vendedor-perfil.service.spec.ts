import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VendedorEstado, type VendedorProfile } from '@agua/contracts';
import { VendedorPerfilService } from './vendedor-perfil.service';

const PROFILE_URL = 'https://api-aguafress.eadev.cloud/api/v1/vendedores/profile';

describe('VendedorPerfilService', () => {
  let service: VendedorPerfilService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorPerfilService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the authenticated vendedor profile without a body or identity params', () => {
    const profile: VendedorProfile = {
      nombre: 'Ana',
      apellido: 'Gómez',
      empresa: 'Aguas del Sur',
      estado: VendedorEstado.ACTIVO,
    };
    let response: VendedorProfile | undefined;

    service.getProfile().subscribe((value) => (response = value));

    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.keys()).toEqual([]);
    request.flush(profile);
    expect(response).toEqual(profile);
  });
});
