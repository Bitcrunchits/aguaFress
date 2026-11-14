import { Component, input } from '@angular/core';

export const STATUS_LABEL_TONES = {
  NEUTRAL: 'neutral',
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  WARNING: 'warning',
} as const;

export type StatusLabelTone = (typeof STATUS_LABEL_TONES)[keyof typeof STATUS_LABEL_TONES];

/**
 * Plain-text estado label with a soft hover. It renders only the label text
 * (no background pill, no border, no squared box); the optional `tone` maps
 * to a subtle semantic text color (positive/negative/warning) while the
 * default `neutral` keeps the standard ink color.
 */
@Component({
  selector: 'app-status-label',
  templateUrl: './status-label.html',
  styleUrl: './status-label.scss',
})
export class StatusLabelComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusLabelTone>(STATUS_LABEL_TONES.NEUTRAL);
}
