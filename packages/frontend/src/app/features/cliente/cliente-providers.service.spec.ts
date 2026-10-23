import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  ClienteProviderResponse,
  ClienteProvidersResponse,
  SelectClienteProviderResponse,
} from '@agua/contracts';
import { ClienteProvidersService } from './cliente-providers.service';

const PROVIDERS_URL = 'https://api-aguafress.eadev.cloud/api/v1/clientes/providers';
const SELECT_PROVIDER_URL = `${PROVIDERS_URL}/select`;

const PROVIDER: ClienteProviderResponse = {
  id: 'vendedor-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  ciudad: 'Córdoba',
  telefono: '3515551234',
  isDefault: true,
};

const PROVIDERS_RESPONSE: ClienteProvidersResponse = {
  providers: [PROVIDER],
  defaultVendedorId: PROVIDER.id,
  requiresSelection: false,
};

const SELECT_RESPONSE: SelectClienteProviderResponse = {
  selectedProvider: PROVIDER,
};

describe('ClienteProvidersService', () => {
  let service: ClienteProvidersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteProvidersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the typed providers response from the clientes providers URL', () => {
    let response: ClienteProvidersResponse | undefined;

    service.listProviders().subscribe((value) => (response = value));

    const request = httpMock.expectOne(PROVIDERS_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(PROVIDERS_RESPONSE);
    expect(response).toEqual(PROVIDERS_RESPONSE);
  });

  it('posts exactly { vendedorId } to the select URL', () => {
    let response: SelectClienteProviderResponse | undefined;

    service.selectProvider('vendedor-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(SELECT_PROVIDER_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ vendedorId: 'vendedor-1' });

    request.flush(SELECT_RESPONSE);
    expect(response).toEqual(SELECT_RESPONSE);
  });
});
