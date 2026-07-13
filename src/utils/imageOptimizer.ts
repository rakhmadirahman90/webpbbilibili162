/**
 * Utility helper to optimize image URLs for fast loading speeds by converting
 * them to next-gen formats (like WebP) and applying compression/resizing.
 */

/**
 * Optimizes an image URL by turning it into a WebP format and applying smart resizing/quality parameters.
 * Supports Unsplash parameters modification and falls back to images.weserv.nl proxy for general external images.
 * 
 * @param url The raw image URL
 * @param width Optional target width for resizing
 * @param quality Compression quality (1-100), defaults to 80
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(url: string, width?: number, quality: number = 80): string {
  if (!url) return '';

  const trimmedUrl = url.trim();

  // Bypass if it is a local asset, data URI (base64), or SVG
  if (
    trimmedUrl.startsWith('/') || 
    trimmedUrl.startsWith('data:') || 
    trimmedUrl.endsWith('.svg') ||
    trimmedUrl.includes('.svg?')
  ) {
    return trimmedUrl;
  }

  try {
    // 1. Optimize Unsplash images directly using their native API parameters
    if (trimmedUrl.includes('images.unsplash.com')) {
      const urlObj = new URL(trimmedUrl);
      
      // Force webp format and optimal compression
      urlObj.searchParams.set('fm', 'webp');
      urlObj.searchParams.set('q', quality.toString());
      
      // Handle responsive width limits if specified
      if (width) {
        urlObj.searchParams.set('w', width.toString());
        urlObj.searchParams.set('fit', 'max');
      } else {
        // If no width specified, set a reasonable default upper bound (e.g., 1200px)
        urlObj.searchParams.set('w', '1200');
        urlObj.searchParams.set('fit', 'max');
      }
      
      return urlObj.toString();
    }

    // 2. Optimize Supabase storage or general external images using images.weserv.nl
    // This is a free, fast, open-source image cache & resize service that supports webp conversion
    const cleanUrl = trimmedUrl.replace(/^https?:\/\//, '');
    let proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&q=${quality}`;
    
    if (width) {
      proxyUrl += `&w=${width}`;
    }
    
    return proxyUrl;
  } catch (error) {
    console.warn('Failed to optimize image URL:', url, error);
    return trimmedUrl; // Fallback to raw URL on error
  }
}

/**
 * React hook or helper function to pre-render or prefetch optimized WebP images
 * in the background for instant sliding transitions.
 */
export function prefetchImage(url: string, width?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) return resolve();
    const optimizedUrl = getOptimizedImageUrl(url, width);
    const img = new Image();
    img.src = optimizedUrl;
    img.onload = () => resolve();
    img.onerror = (err) => reject(err);
  });
}
