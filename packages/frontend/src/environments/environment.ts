export interface EnvironmentConfig {
  readonly production: boolean;
  readonly apiBaseUrl: string;
}

export const environment: EnvironmentConfig = {
  production: true,
  apiBaseUrl: 'https://api-aguafress.eadev.cloud'
} as const;
