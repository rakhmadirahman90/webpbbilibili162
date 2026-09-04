/** Fast image URL optimizer for public web images. */

export function getOptimizedImageUrl(url: string, width?: number, quality: number = 78): string {
  if (!url) return '';
  const trimmedUrl = url.trim().split(/[\s,]+/)[0];
  if (!trimmedUrl) return '';

  // Local/data/SVG assets should stay on their native URL.
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('data:') || /\.svg(?:\?|$)/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  try {
    // Supabase public Storage supports server-side image transformations.
    // Only rewrite explicitly public objects; signed/private KTP/document URLs are untouched.
    const publicMarker = '/storage/v1/object/public/';
    const supabaseIndex = trimmedUrl.indexOf(publicMarker);
    if (supabaseIndex >= 0) {
      const origin = trimmedUrl.slice(0, supabaseIndex);
      const objectPath = trimmedUrl.slice(supabaseIndex + publicMarker.length);
      const transformed = new URL(`${origin}/storage/v1/render/image/public/${objectPath}`);
      if (width) transformed.searchParams.set('width', String(Math.min(Math.max(width, 160), 1600)));
      transformed.searchParams.set('quality', String(Math.min(Math.max(quality, 45), 85)));
      transformed.searchParams.set('resize', 'contain');
      return transformed.toString();
    }

    // Unsplash has native responsive WebP support.
    if (trimmedUrl.includes('images.unsplash.com')) {
      const imageUrl = new URL(trimmedUrl);
      imageUrl.searchParams.set('fm', 'webp');
      imageUrl.searchParams.set('q', String(quality));
      imageUrl.searchParams.set('w', String(width || 1200));
      imageUrl.searchParams.set('fit', 'max');
      return imageUrl.toString();
    }

    // External public images: use a cached WebP resize proxy.
    const cleanUrl = trimmedUrl.replace(/^https?:\/\//, '');
    const params = new URLSearchParams({ url: cleanUrl, output: 'webp', q: String(quality) });
    if (width) params.set('w', String(Math.min(Math.max(width, 160), 1600)));
    return `https://images.weserv.nl/?${params.toString()}`;
  } catch {
    return trimmedUrl;
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
