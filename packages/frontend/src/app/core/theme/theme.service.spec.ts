import { TestBed } from '@angular/core/testing';
import { ThemeMode } from './theme.models';
import { ThemeService } from './theme.service';
import { DARK_CLASS, THEME_STORAGE_KEY, resolveMode } from './theme.bootstrap';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_CLASS);
    document.documentElement.style.colorScheme = '';
  });

  function createService(): ThemeService {
    return TestBed.inject(ThemeService);
  }

  it('defaults to the system preference when nothing is persisted', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const mode = resolveMode();
    expect(mode).toBe(ThemeMode.Dark);
  });

  it('persisted preference wins over the system preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, ThemeMode.Light);
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    expect(resolveMode()).toBe(ThemeMode.Light);
  });

  it('tolerates an unavailable localStorage and falls back to the system', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    spyOn(Storage.prototype, 'getItem').and.throwError('denied');
    expect(resolveMode()).toBe(ThemeMode.Light);
  });

  it('setMode applies the dark class, updates color-scheme and persists', () => {
    service = createService();
    service.setMode(ThemeMode.Dark);

    expect(document.documentElement.classList.contains(DARK_CLASS)).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe(ThemeMode.Dark);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(ThemeMode.Dark);
    expect(service.mode()).toBe(ThemeMode.Dark);
  });

  it('setMode to light removes the dark class and persists light', () => {
    service = createService();
    service.setMode(ThemeMode.Dark);
    service.setMode(ThemeMode.Light);

    expect(document.documentElement.classList.contains(DARK_CLASS)).toBeFalse();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(ThemeMode.Light);
  });
});
