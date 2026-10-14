import type { EnvironmentConfig } from './environment';

export const environment: EnvironmentConfig = {
  production: false,
  apiBaseUrl: 'https://api-aguafress.eadev.cloud'
} as const;
