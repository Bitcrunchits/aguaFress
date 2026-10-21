export const ENVIRONMENTS = {
  LOCAL: 'local',
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
} as const;

export type EnvironmentName = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

export interface EnvironmentConfig {
  readonly production: boolean;
  readonly apiBaseUrl: string;
}

export interface EnvironmentConfigV2 extends EnvironmentConfig {
  readonly environmentName: EnvironmentName;
  readonly showEnvironmentBanner: boolean;
}
