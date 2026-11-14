import { API_CONFIG } from '../core/config/api.config';

/**
 * Builds the absolute preview URL for a storage-relative upload id (e.g.
 * `logos/<id>.webp` or `products/<id>.webp`). The gateway serves uploads at
 * `/uploads/<imageId>` on the API origin, so a relative `src` would resolve
 * against the frontend origin and break the preview. Absolute URLs pass
 * through unchanged.
 */
export function toUploadUrl(imageId: string): string {
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    return imageId;
  }
  return `${API_CONFIG.baseUrl}/uploads/${imageId}`;
}
