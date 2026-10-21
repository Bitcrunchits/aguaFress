import type { EnvironmentConfigV2 } from './environment-config';

export const environment: EnvironmentConfigV2 = {
  production: false,
  environmentName: 'local',
  showEnvironmentBanner: true,
  apiBaseUrl: 'http://localhost:3000',
} as const;
