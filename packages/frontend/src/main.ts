import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { applyInitialTheme } from './app/core/theme/theme.bootstrap';

// Apply the resolved theme before bootstrap so the first paint is not the
// wrong mode (avoids a flash of the light theme on dark-preferring users).
applyInitialTheme();

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  throw error;
});
