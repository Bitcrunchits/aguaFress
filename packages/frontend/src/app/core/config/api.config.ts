import { environment } from '../../../environments/environment';

export interface ApiConfig {
  readonly baseUrl: string;
}

export const API_CONFIG: ApiConfig = {
  baseUrl: environment.apiBaseUrl
} as const;
