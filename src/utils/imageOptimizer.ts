/** Keep original image URLs reliable; Supabase render/image can fail on some plans or files. */
import { resolveMediaUrl } from './resolveMediaUrl';

export function getOptimizedImageUrl(url: string, width?: number, quality: number = 78): string {
  if (!url) return '';
  const trimmed = resolveMediaUrl(url.trim());
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    // Do not proxy Supabase media or convert object/public to render/image/public.
    // Direct URLs work without image transformation subscriptions and preserve signed tokens.
    if (parsed.hostname.endsWith('.supabase.co') && parsed.pathname.startsWith('/storage/v1/')) {
      return trimmed;
    }
    // External media should also load from their original origin rather than a third-party proxy.
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function prefetchImage(url: string, width?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) return resolve();
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = getOptimizedImageUrl(url, width);
  });
}
