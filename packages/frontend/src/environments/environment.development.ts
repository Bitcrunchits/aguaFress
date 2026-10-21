import type { EnvironmentConfigV2 } from './environment-config';

export const environment: EnvironmentConfigV2 = {
  production: false,
  environmentName: 'development',
  showEnvironmentBanner: true,
  apiBaseUrl: 'https://api-aguafress.eadev.cloud',
} as const;
