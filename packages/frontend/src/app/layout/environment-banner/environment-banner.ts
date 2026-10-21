import { Component, computed, input } from '@angular/core';
import { ENVIRONMENTS, type EnvironmentName } from '../../../environments/environment-config';

const ENVIRONMENT_LABELS: Record<EnvironmentName, string | null> = {
  [ENVIRONMENTS.LOCAL]: 'AMBIENTE LOCAL',
  [ENVIRONMENTS.DEVELOPMENT]: 'AMBIENTE DESARROLLO',
  [ENVIRONMENTS.PRODUCTION]: null,
};

@Component({
  selector: 'app-environment-banner',
  templateUrl: './environment-banner.html',
  styleUrl: './environment-banner.scss',
})
export class EnvironmentBannerComponent {
  readonly environmentName = input.required<EnvironmentName>();

  readonly label = computed(() => ENVIRONMENT_LABELS[this.environmentName()]);
}
