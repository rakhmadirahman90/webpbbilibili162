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

/** Stable lazy image with atomic source swapping and no visual dark overlay. */
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
  const requestRef = useRef(0);
  const onErrorRef = useRef(onError);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);

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
      { rootMargin: '240px 0px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !optimizedSrc) return;
    const requestId = ++requestRef.current;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (requestId !== requestRef.current) return;
      setDisplaySrc(optimizedSrc);
      setLoaded(true);
    };
    image.onerror = () => {
      if (requestId !== requestRef.current) return;
      if (primarySrc && primarySrc !== optimizedSrc) {
        const fallback = new Image();
        fallback.onload = () => {
          if (requestId !== requestRef.current) return;
          setDisplaySrc(primarySrc);
          setLoaded(true);
        };
        fallback.onerror = event => onErrorRef.current?.(event);
        fallback.src = primarySrc;
      } else {
        onErrorRef.current?.(image);
      }
    };
    image.src = optimizedSrc;
    return () => {
      requestRef.current += 1;
      image.onload = null;
      image.onerror = null;
    };
  }, [isInView, optimizedSrc, primarySrc]);

  return (
    <div ref={containerRef} className={`relative isolate overflow-hidden bg-transparent ${containerClassName}`} onClick={onClick}>
      {!loaded && !displaySrc && <div aria-hidden="true" className="absolute inset-0 bg-slate-100" />}
      {isInView && displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={event => onErrorRef.current?.(event)}
          className={`${className} relative z-[1] block opacity-100 brightness-100 contrast-100 saturate-100 filter-none transform-none`}
        />
      )}
    </div>
  );
}
