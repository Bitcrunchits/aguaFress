/**
 * Preset avatars a vendedor can pick for their profile `logo`.
 *
 * Source: DiceBear (https://www.dicebear.com) — open-source avatar library.
 * The "lorelei" style is CC0 1.0 (public domain, no attribution, commercial
 * use allowed). Avatars are rendered as absolute URLs from the public DiceBear
 * HTTP API, so the existing `toUploadUrl` helper passes them through unchanged.
 *
 * NOTE: the public API is free for non-commercial use. For production, either
 * self-host DiceBear (single Docker container) or replace these URLs with
 * locally-served copies of the same CC0 artwork.
 */
export const VENDEDOR_AVATARS: readonly string[] = [
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Aria&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Bruno&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Carla&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Diego&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Elena&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Facundo&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Gisela&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Hugo&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Irina&size=128',
  'https://api.dicebear.com/10.x/lorelei/svg?seed=Julio&size=128',
];
