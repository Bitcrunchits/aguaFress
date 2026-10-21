import type { EnvironmentConfigV2 } from './environment-config';

export const environment: EnvironmentConfigV2 = {
  production: true,
  environmentName: 'production',
  showEnvironmentBanner: false,
  apiBaseUrl: 'https://api-aguafress.eadev.cloud',
} as const;
