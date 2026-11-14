import { Injectable, signal } from '@angular/core';
import { DARK_CLASS, THEME_STORAGE_KEY, resolveMode } from './theme.bootstrap';
import { ThemeMode } from './theme.models';

/**
 * Owns the claro/oscuro theme: resolves the initial mode (persisted preference
 * or system default), applies/removes `.agua-dark` on `documentElement`,
 * updates `color-scheme`, and persists explicit selections. The initial mode
 * is also applied pre-bootstrap (see `theme.bootstrap.ts`) to avoid a flash of
 * the wrong theme. Independent of auth/session and never touches HTTP.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>(resolveMode());

  /** Read-only signal exposing the current theme. */
  readonly mode = this.modeSignal.asReadonly();

  constructor() {
    // Apply the resolved mode (idempotent with the pre-bootstrap application).
    this.applyMode(this.modeSignal());
  }

  setMode(mode: ThemeMode): void {
    if (this.modeSignal() === mode) {
      return;
    }
    this.modeSignal.set(mode);
    this.applyMode(mode);
    this.persist(mode);
  }

  private applyMode(mode: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle(DARK_CLASS, mode === ThemeMode.Dark);
    root.style.colorScheme = mode;
  }

  private persist(mode: ThemeMode): void {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage may be unavailable (private mode); the theme still applies
      // for this session, it just won't persist.
    }
  }
}
