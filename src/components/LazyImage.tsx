import { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  width?: number;
  quality?: number;
  onClick?: (e: any) => void;
  onError?: (e: any) => void;
}

/**
 * Stable lazy image.
 *
 * Important: this component intentionally does not animate the placeholder,
 * opacity, blur or transform. Gallery images must appear at a fixed geometry
 * without a shimmer/fade that can be perceived as screen flicker on mobile.
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  width,
  quality = 80,
  onClick,
  onError,
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const primarySrc = (src || '').trim().split(/[\s,]+/)[0] || '';
  const [currentSrc, setCurrentSrc] = useState(() => getOptimizedImageUrl(primarySrc, width, quality));

  useEffect(() => {
    const nextSrc = getOptimizedImageUrl(primarySrc, width, quality);
    setCurrentSrc(nextSrc);
    setIsLoaded(false);
  }, [primarySrc, width, quality]);

  const handleImgError = (e: any) => {
    if (currentSrc !== primarySrc && primarySrc) {
      setCurrentSrc(primarySrc);
    } else {
      setIsLoaded(true);
      onError?.(e);
    }
  };

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#12141c]/40 ${containerClassName}`}
      onClick={onClick}
    >
      {/* Static placeholder only: no pulse, shimmer, blur or opacity animation. */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/20"
        />
      )}

      {isInView && (
        <img
          src={currentSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleImgError}
          className={`${className} block opacity-100 blur-0 transform-none`}
        />
      )}
    </div>
  );
}
