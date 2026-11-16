import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserRole, type SuperAdminProfileResponse } from '@agua/contracts';
import { AdminProfileService } from './admin-profile.service';

const PROFILE_URL = 'https://api-aguafress.eadev.cloud/api/v1/super-admin/profile';
const UPDATE_PROFILE_URL = 'https://api-aguafress.eadev.cloud/api/v1/super-admin/profile/update';

const PROFILE: SuperAdminProfileResponse = {
  id: 'super-admin-1',
  email: 'admin@example.com',
  nombre: 'Ana',
  apellido: 'Gómez',
  role: UserRole.SUPER_ADMIN,
};

describe('AdminProfileService', () => {
  let service: AdminProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the full super-admin profile', () => {
    let response: SuperAdminProfileResponse | undefined;

    service.getProfile().subscribe((value) => (response = value));

    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('GET');

    request.flush(PROFILE);
    expect(response).toEqual(PROFILE);
  });

  it('posts nombre/apellido and returns the narrow update response', () => {
    let response: { id: string; nombre: string; apellido: string } | undefined;

    service
      .updateProfile({ nombre: 'María', apellido: 'Pérez' })
      .subscribe((value) => (response = value));

    const request = httpMock.expectOne(UPDATE_PROFILE_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'María', apellido: 'Pérez' });

    request.flush({ id: 'super-admin-1', nombre: 'María', apellido: 'Pérez' });
    expect(response).toEqual({ id: 'super-admin-1', nombre: 'María', apellido: 'Pérez' });
  });
});
