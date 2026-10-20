import type { EnvironmentConfig } from './environment-config';

export const environment: EnvironmentConfig = {
  production: true,
  apiBaseUrl: 'https://api-aguafress.eadev.cloud'
} as const;
