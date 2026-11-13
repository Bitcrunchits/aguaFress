import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { toDataURL } from 'qrcode';
import type { QRCodeToDataURLOptions } from 'qrcode';

/** Reasonable PNG render: compact margin, fixed width, on-brand dark color. */
const QR_OPTIONS: QRCodeToDataURLOptions = {
  margin: 1,
  width: 320,
  color: { dark: '#0b1f33', light: '#ffffff' },
};

/**
 * Thin wrapper over the `qrcode` browser renderer. Exposed as an injectable
 * so pages can stub the (canvas-backed) render in unit tests, and so the
 * Promise-based `toDataURL` API is normalized into the reactive style the
 * feature uses everywhere else.
 */
@Injectable({ providedIn: 'root' })
export class QrCodeService {
  /** Renders `text` as a PNG data URL. */
  toDataUrl(text: string): Observable<string> {
    return from(toDataURL(text, QR_OPTIONS));
  }
}
