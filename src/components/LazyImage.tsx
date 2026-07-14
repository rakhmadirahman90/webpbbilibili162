import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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

  const optimizedSrc = getOptimizedImageUrl(src, width, quality);

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
      {
        rootMargin: '200px 0px', // Load 200px before the image enters viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#12141c]/40 ${containerClassName}`}
      onClick={onClick}
    >
      {/* Blur-up placeholder background gradient with shimmer effect */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/20 animate-pulse flex items-center justify-center" />
      )}

      {/* Actual image loaded dynamically when in view */}
      {isInView && (
        <motion.img
          src={optimizedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={onError}
          initial={{ filter: 'blur(20px)', opacity: 0 }}
          animate={
            isLoaded
              ? { filter: 'blur(0px)', opacity: 1 }
              : { filter: 'blur(20px)', opacity: 0 }
          }
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`${className} ${isLoaded ? '' : 'pointer-events-none'}`}
        />
      )}
    </div>
  );
}
