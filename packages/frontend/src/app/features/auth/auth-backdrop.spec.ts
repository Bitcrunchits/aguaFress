import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { THEME_STORAGE_KEY } from '../../core/theme/theme.bootstrap';
import { ThemeMode } from '../../core/theme/theme.models';
import { ThemeService } from '../../core/theme/theme.service';
import { InvitePage } from './invite-page/invite-page';
import { LoginPage } from './login-page/login-page';
import { RegisterPage } from './register-page/register-page';

describe('public route backdrop', () => {
  let theme: ThemeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage, RegisterPage, InvitePage],
      providers: [provideRouter([]), { provide: AuthService, useValue: {} }],
    }).compileComponents();
    theme = TestBed.inject(ThemeService);
    theme.setMode(ThemeMode.Light);
  });

  afterEach(() => {
    theme.setMode(ThemeMode.Light);
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });

  const publicPages: ReadonlyArray<[Type<unknown>, string, string]> = [
    [LoginPage, '.login-layout', '.login-card'],
    [RegisterPage, '.register-layout', '.register-card'],
    [InvitePage, '.invite-layout', '.invite-card'],
  ];

  for (const [page, layoutSelector, cardSelector] of publicPages) {
    it(`renders a water-toned backdrop behind ${layoutSelector} and switches it in dark mode`, () => {
      const fixture = TestBed.createComponent(page);
      fixture.detectChanges();
      const layout = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(layoutSelector)!;
      const card = layout.querySelector<HTMLElement>(cardSelector)!;
      const toggle = layout.querySelector<HTMLButtonElement>('.theme-toggle')!;

      expect(getComputedStyle(layout).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(205, 235, 238)');
      expect(getComputedStyle(document.body).backgroundImage).not.toBe('none');
      expect(toggle.getAttribute('aria-label')).toBe('Cambiar a modo oscuro');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');

      toggle.click();
      fixture.detectChanges();

      expect(document.documentElement.classList.contains('agua-dark')).toBeTrue();
      expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(7, 31, 38)');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(16, 50, 61)');
      expect(toggle.getAttribute('aria-label')).toBe('Cambiar a modo claro');
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(ThemeMode.Dark);
    });
  }
});
