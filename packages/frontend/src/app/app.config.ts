import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { SessionStorageService } from './core/auth/session-storage.service';
import { authInterceptor } from './core/http/auth.interceptor';
import { AguaPreset } from './core/theme/agua-preset';
import { CLIENTE_TRACKING_SESSION_READER } from './features/cliente/cliente-tracking.contract';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: CLIENTE_TRACKING_SESSION_READER, useExisting: SessionStorageService },
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: AguaPreset,
        options: {
          prefix: 'p',
          darkModeSelector: '.agua-dark',
          cssLayer: false,
        },
      },
    }),
  ],
};
