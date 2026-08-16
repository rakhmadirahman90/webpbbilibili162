import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { getSiteSetting, appendCacheBustParam } from '../utils/siteSettingsHelper';
import { useRealtimeSync } from '../utils/realtimeSync';
import { supabase } from '../supabase';

const SUPABASE_STORAGE = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public';
const HERO_VIDEO = `${SUPABASE_STORAGE}/assets/hero-sliders/hero-video-1786206060056.webm`;
const HERO_POSTER = `${SUPABASE_STORAGE}/assets/hero-sliders/hero-poster-1786206060056.webp`;

export function isVideoUrl(url?: string, type?: string): boolean {
  if (type === 'video') return true;
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  if (clean.startsWith('data:video/')) return true;
  if (clean.startsWith('blob:')) return true;
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') ||
    clean.endsWith('.ogg') || clean.endsWith('.m4v') || clean.includes('video/') ||
    clean.includes('hero-video') || clean.includes('.mp4') || clean.includes('.webm') ||
    clean.includes('youtube.com') || clean.includes('youtu.be') || clean.includes('vimeo.com');
}

export function getEmbedVideoUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
    else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1]?.split('&')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0`;
  }
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (videoId) return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`;
  }
  return null;
}

function HeroVideoPlayer({ src, poster, isCurrent }: { src: string; poster?: string; isCurrent: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => setHasError(false), [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    if (isCurrent && !hasError) {
      video.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    } else {
      video.pause();
    }
  }, [isCurrent, src, hasError]);

  const embedUrl = getEmbedVideoUrl(src);
  if (embedUrl) {
    return <iframe src={embedUrl} className="w-full h-full object-cover border-0 pointer-events-none" allow="autoplay; encrypted-media" title="Hero Video" />;
  }

  if (hasError && poster) {
    return <img src={poster} alt="PB Bilibili 162" className="w-full h-full object-cover object-center" />;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      controls={false}
      preload="metadata"
      onError={() => setHasError(true)}
      className={`w-full h-full object-cover object-center select-none transition-transform duration-[20000ms] ease-out ${isCurrent ? 'scale-102' : 'scale-100'}`}
    />
  );
}

function HeroVideoBlur({ src, isCurrent }: { src: string; isCurrent: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    if (isCurrent) video.play().catch(() => {}); else video.pause();
  }, [isCurrent, src]);
  if (getEmbedVideoUrl(src)) return null;
  return <video ref={videoRef} src={src} autoPlay loop muted playsInline aria-hidden="true" className="w-full h-full object-cover blur-3xl opacity-70 scale-110 select-none pointer-events-none" />;
}

export const defaultSlides = [
  {
    id: 'pb162-video-2026',
    title: 'PB BILIBILI 162',
    subtitle: 'PROFESSIONAL CLUB',
    image: HERO_VIDEO,
    videoUrl: HERO_VIDEO,
    poster: HERO_POSTER,
    type: 'video',
    active: true
  }
];

async function loadWawanSlide() {
  try {
    const { data, error } = await supabase
      .from('pendaftaran')
      .select('id, nama, foto_url')
      .ilike('nama', '%Wawan%')
      .not('foto_url', 'is', null)
      .limit(10);

    if (error || !data?.length) return null;

    const member = data.find((row: any) => {
      const name = String(row.nama || '').toLowerCase();
      return name.includes('wawan') && name.includes('h.');
    }) || data.find((row: any) => String(row.nama || '').toLowerCase().includes('wawan'));

    if (!member?.foto_url) return null;

    const raw = String(member.foto_url).trim().split(/[\s,]+/)[0];
    if (!raw) return null;

    return {
      id: `ketua-wawan-${member.id || 'profile'}`,
      title: 'H. Wawan',
      subtitle: 'Ketua Umum PB Bilibili 162',
      image: raw,
      type: 'image',
      active: true,
      updated_at: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<any[]>(defaultSlides);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [settings, setSettings] = useState({ duration: 7 });

  const loadHeroConfig = async () => {
    // Always keep the known-good PB Bilibili video as slide 1.
    // The second slide is the real H. Wawan photo from pendaftaran.foto_url.
    try {
      const wawanSlide = await loadWawanSlide();
      setSlides(wawanSlide ? [defaultSlides[0], wawanSlide] : [defaultSlides[0]]);

      const data = await getSiteSetting('hero_config');
      if (data?.settings?.duration) {
        setSettings({ duration: Math.max(5, Number(data.settings.duration) || 7) });
      }
    } catch (err) {
      console.warn('[Hero] Failed to load configuration:', err);
      setSlides([defaultSlides[0]]);
    }
  };

  useEffect(() => {
    loadHeroConfig();
  }, []);

  useRealtimeSync({
    tables: ['site_settings', 'pendaftaran'],
    settingKeys: ['hero_config'],
    onUpdate: () => {
      loadHeroConfig();
    }
  });

  useEffect(() => {
    if (currentSlide >= slides.length) setCurrentSlide(0);
  }, [slides, currentSlide]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => handleNext(), settings.duration * 1000);
    return () => clearInterval(timer);
  }, [slides.length, currentSlide, settings.duration]);

  const handleNext = () => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    setCurrentSlide(prev => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 700);
  };

  const handlePrev = () => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 700);
  };

  return (
    <section id="home" className="relative w-full pt-16 lg:pt-20 pb-2 sm:pb-4 bg-[#070d1a] overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 w-full">
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/9] md:aspect-[2.1/1] lg:aspect-[2.25/1] min-h-[220px] sm:min-h-[280px] max-h-[580px] rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center">
            {slides.map((slide, index) => {
              const slideTs = slide.updated_at || slide.timestamp || slide.id;
              const rawMediaSrc = slide.videoUrl || (isVideoUrl(slide.image, slide.type) ? slide.image : null) || slide.image;
              const rawPosterSrc = slide.poster || (slide.image && slide.image !== rawMediaSrc ? slide.image : undefined);
              const mediaSrc = appendCacheBustParam(rawMediaSrc, slideTs);
              const posterSrc = appendCacheBustParam(rawPosterSrc, slideTs);
              const imageSrc = appendCacheBustParam(slide.image, slideTs);
              const isVideo = slide.type === 'video' || isVideoUrl(rawMediaSrc, slide.type) || isVideoUrl(slide.image, slide.type);
              const isCurrent = index === currentSlide;

              return (
                <div key={slide.id || index} className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-700 ease-in-out ${isCurrent ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                  <div className="absolute inset-0 overflow-hidden w-full h-full">
                    {isVideo ? (
                      <HeroVideoBlur src={mediaSrc} isCurrent={isCurrent} />
                    ) : (
                      <img src={getOptimizedImageUrl(imageSrc, 300, 45)} alt="" className="w-full h-full object-cover blur-3xl opacity-70 scale-110 select-none pointer-events-none" loading="lazy" decoding="async" />
                    )}
                  </div>

                  {isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center z-10">
                      <HeroVideoPlayer src={mediaSrc} poster={posterSrc} isCurrent={isCurrent} />
                    </div>
                  ) : (
                    <img src={getOptimizedImageUrl(imageSrc, 1600, 82)} alt={slide.title || 'H. Wawan - Ketua Umum PB Bilibili 162'} loading={index === 1 ? 'eager' : 'lazy'} decoding="async" className="relative w-full h-full object-cover object-center select-none z-10" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-60% to-black/60 z-20 pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button onClick={handlePrev} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-xs transition-all active:scale-90" aria-label="Previous slide">
              <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
            <button onClick={handleNext} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-xs transition-all active:scale-90" aria-label="Next slide">
              <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
            <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2.5 z-30">
              {slides.map((_, index) => (
                <button key={index} onClick={() => !isTransitioning && setCurrentSlide(index)} className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-4 sm:w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/70'}`} aria-label={`Go to slide ${index + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
