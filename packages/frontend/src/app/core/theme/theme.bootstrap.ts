import { ThemeMode } from './theme.models';

export const THEME_STORAGE_KEY = 'aguafress.theme';
export const DARK_CLASS = 'agua-dark';

/**
 * Resolves the initial theme: persisted preference wins, then the OS
 * `prefers-color-scheme`. Tolerates unavailable `localStorage`/`matchMedia`.
 */
export function resolveMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === ThemeMode.Light || stored === ThemeMode.Dark) {
      return stored;
    }
  } catch {
    // Storage unavailable — fall through to system preference.
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? ThemeMode.Dark
      : ThemeMode.Light;
  } catch {
    return ThemeMode.Light;
  }
}

/**
 * Applies the resolved theme to `document.documentElement` before Angular
 * bootstraps, so the first paint already has the correct `.agua-dark` class
 * and `color-scheme`. The `ThemeService` re-reads the same preference in its
 * constructor, so the two stay consistent.
 */
export function applyInitialTheme(): void {
  const mode = resolveMode();
  document.documentElement.classList.toggle(DARK_CLASS, mode === ThemeMode.Dark);
  document.documentElement.style.colorScheme = mode;
}
