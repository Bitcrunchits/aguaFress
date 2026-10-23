import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UserRole, type LoginResponse } from '@agua/contracts';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  const ready = new BehaviorSubject(false);
  const auth = {
    sessionReady$: ready.asObservable(),
    currentSession: null as LoginResponse | null,
    logout: jasmine.createSpy('logout'),
  };

  beforeEach(async () => {
    ready.next(false);
    auth.currentSession = null;
    auth.logout.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  for (const [role, path, label] of [
    [UserRole.SUPER_ADMIN, '/admin', 'Administración'],
    [UserRole.VENDEDOR, '/vendedor', 'Vendedor'],
    [UserRole.CLIENTE, '/cliente', 'Cliente'],
  ] as const) {
    it(`shows only the ${role} home link and logout when ready`, () => {
      auth.currentSession = {
        token: 'access', refreshToken: 'refresh',
        user: { id: 'user-1', email: 'user@example.com', role },
      };
      const fixture = TestBed.createComponent(AppShell);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('nav')).toBeNull();
      expect(element.querySelector('button')).toBeNull();

      ready.next(true);
      fixture.detectChanges();
      const links = element.querySelectorAll('a');
      expect(links.length).toBe(role === UserRole.CLIENTE ? 2 : 1);
      expect(links[0].getAttribute('href')).toBe(path);
      expect(links[0].textContent?.trim()).toBe('Inicio');
      if (role === UserRole.CLIENTE) {
        expect(links[1].getAttribute('href')).toBe('/cliente/catalogo');
        expect(links[1].textContent?.trim()).toBe('Catálogo');
      }
      expect(element.querySelector('.shell__identity')?.textContent).toContain(label);
      const button = element.querySelector('button');
      expect(button?.textContent?.trim()).toBe('Cerrar sesión');
      button?.click();
      expect(auth.logout).toHaveBeenCalledTimes(1);
    });
  }

  it('removes navigation on session revalidation or logout', () => {
    auth.currentSession = {
      token: 'access', refreshToken: 'refresh',
      user: { id: 'user-1', email: 'user@example.com', role: UserRole.CLIENTE },
    };
    const fixture = TestBed.createComponent(AppShell);
    ready.next(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).not.toBeNull();

    ready.next(false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
    auth.currentSession = null;
    ready.next(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});

@Component({ template: '<p id="admin-view">Admin private view</p>' })
class AdminView {}

@Component({ template: '<p id="client-view">Client private view</p>' })
class ClientView {}

describe('AppShell routed content', () => {
  const ready = new BehaviorSubject(true);
  const auth = {
    sessionReady$: ready.asObservable(),
    currentSession: {
      token: 'access', refreshToken: 'refresh',
      user: { id: 'admin-1', email: 'admin@example.com', role: UserRole.SUPER_ADMIN },
    } as LoginResponse | null,
    logout: jasmine.createSpy('logout'),
  };

  beforeEach(async () => {
    ready.next(true);
    auth.currentSession = {
      token: 'access', refreshToken: 'refresh',
      user: { id: 'admin-1', email: 'admin@example.com', role: UserRole.SUPER_ADMIN },
    };
    await TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([{
          path: '', component: AppShell, children: [
            { path: 'admin', component: AdminView },
            { path: 'cliente', component: ClientView },
          ],
        }]),
      ],
    }).compileComponents();
  });

  it('destroys an already rendered protected page during revalidation and restores it only for its role', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(harness.routeNativeElement?.querySelector('#admin-view')).not.toBeNull();

    ready.next(false);
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#admin-view')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('router-outlet')).toBeNull();

    ready.next(true);
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#admin-view')).not.toBeNull();
  });

  it('never restores the previous role page when revalidation changes the role', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(harness.routeNativeElement?.querySelector('#admin-view')).not.toBeNull();

    ready.next(false);
    harness.fixture.detectChanges();
    auth.currentSession = {
      token: 'new-access', refreshToken: 'new-refresh',
      user: { id: 'client-1', email: 'client@example.com', role: UserRole.CLIENTE },
    };
    ready.next(true);
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#admin-view')).toBeNull();

    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/cliente');
    expect(harness.routeNativeElement?.querySelector('#admin-view')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('#client-view')).not.toBeNull();
  });
});
