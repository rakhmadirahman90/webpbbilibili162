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

/** Lazy image: one network request, async decoding, viewport loading and raw fallback. */
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
  const primarySrc = (src || '').trim().split(/[\s,]+/)[0] || '';
  const optimizedSrc = getOptimizedImageUrl(primarySrc, width, quality);
  const [isInView, setIsInView] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(optimizedSrc);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const fallbackUsedRef = useRef(false);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    setDisplaySrc(optimizedSrc);
    setLoaded(false);
    fallbackUsedRef.current = false;
  }, [optimizedSrc]);

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
      { rootMargin: '160px 0px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleError = (event: any) => {
    if (!fallbackUsedRef.current && primarySrc && primarySrc !== optimizedSrc) {
      fallbackUsedRef.current = true;
      setDisplaySrc(primarySrc);
      return;
    }
    onErrorRef.current?.(event);
  };

  return (
    <div ref={containerRef} className={`relative isolate overflow-hidden bg-transparent ${containerClassName}`} onClick={onClick}>
      {isInView && displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`${className} relative z-[1] block opacity-100 brightness-100 contrast-100 saturate-100 filter-none transform-none`}
        />
      )}
      {!loaded && <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-slate-100/5" />}
    </div>
  );
}
