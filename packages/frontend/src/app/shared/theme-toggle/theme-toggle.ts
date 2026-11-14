import { Component, inject } from '@angular/core';
import { ThemeMode } from '../../core/theme/theme.models';
import { ThemeService } from '../../core/theme/theme.service';

/**
 * Reusable light/dark toggle. Renders a single accessible button that flips
 * the theme and exposes the pressed state via aria-pressed. Used both in the
 * app-shell header and on public (pre-auth) screens, so the theme stays
 * switchable everywhere without duplicating the toggle logic.
 */
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  readonly theme = inject(ThemeService);
  readonly ThemeMode = ThemeMode;

  toggle(): void {
    this.theme.setMode(this.theme.mode() === ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark);
  }
}
