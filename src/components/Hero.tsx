import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase'; 
import { getOptimizedImageUrl } from '../utils/imageOptimizer'; 
import { getSiteSetting } from '../utils/siteSettingsHelper';

export function isVideoUrl(url?: string, type?: string): boolean {
  if (type === 'video') return true;
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  if (clean.startsWith('data:video/')) return true;
  if (clean.startsWith('blob:')) return true;
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4v') ||
    clean.includes('video/') ||
    clean.includes('hero-video') ||
    clean.includes('.mp4') ||
    clean.includes('.webm') ||
    clean.includes('youtube.com') ||
    clean.includes('youtu.be') ||
    clean.includes('vimeo.com')
  );
}

export function getEmbedVideoUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0`;
    }
  }
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`;
    }
  }
  return null;
}

function HeroVideoPlayer({ src, poster, isCurrent }: { src: string; poster?: string; isCurrent: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    if (isCurrent && !hasError) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay error on hero video:", err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    } else {
      video.pause();
    }
  }, [isCurrent, src, hasError]);

  const embedUrl = getEmbedVideoUrl(src);
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full object-cover border-0 pointer-events-none"
        allow="autoplay; encrypted-media"
        title="Hero Video"
      />
    );
  }

  if (hasError && poster) {
    return (
      <img
        src={poster}
        alt="Hero Poster Fallback"
        className={`w-full h-full object-contain object-center transition-transform duration-[20000ms] ease-out select-none ${
          isCurrent ? 'scale-102' : 'scale-100'
        }`}
      />
    );
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
      preload="auto"
      onError={() => {
        console.warn("Hero video failed to load, switching to poster fallback:", src);
        setHasError(true);
      }}
      className={`w-full h-full object-cover object-center transition-transform duration-[20000ms] ease-out select-none ${
        isCurrent ? 'scale-102' : 'scale-100'
      }`}
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
    if (isCurrent) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isCurrent, src]);

  const embedUrl = getEmbedVideoUrl(src);
  if (embedUrl) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      className="w-full h-full object-cover blur-3xl opacity-80 scale-110 select-none pointer-events-none"
    />
  );
}

export const defaultSlides = [
  {
    id: 1786206064378,
    title: 'PB Bilibili Video Hero',
    subtitle: '',
    image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
    videoUrl: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
    poster: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-poster-1786206060056.webp',
    type: 'video',
    active: true
  },
  {
    id: 'video-main-1',
    title: 'PB Bilibili 162 Professional Club',
    subtitle: 'Klub Bulutangkis Profesional dengan Fasilitas & Pembinaan Standar BWF',
    image: '/vid-20260206-wa0019.mp4',
    videoUrl: '/vid-20260206-wa0019.mp4',
    poster: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg',
    type: 'video',
    active: false,
    titleSize: 28,
    subtitleSize: 12,
    fontFamily: 'font-sans'
  },
  { id: 1, image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg', active: false },
  { id: 2, image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg', active: false },
  { id: 3, image: '/whatsapp_image_2026-02-02_at_09.53.05_(2).jpeg', active: false },
  { id: 4, image: '/whatsapp_image_2026-02-02_at_09.53.05_(3).jpeg', active: false },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<any[]>([defaultSlides[0]]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [settings, setSettings] = useState({ duration: 7 });

  const loadHeroConfig = async () => {
    try {
      const data = await getSiteSetting('hero_config');
      if (data) {
        let config = data;
        if (typeof config === 'string') {
          try {
            config = JSON.parse(config);
          } catch (e) {}
        }
        const allSlides = config.slides || (Array.isArray(config) ? config : []);
        const activeSlides = allSlides.filter((s: any) => s && s.active === true);
        if (activeSlides.length > 0) {
          setSlides(activeSlides);
        } else {
          setSlides([defaultSlides[0]]);
        }
        if (config.settings) {
          setSettings(config.settings);
        }
      } else {
        setSlides([defaultSlides[0]]);
      }
    } catch (err) {
      console.warn("Error fetching hero data:", err);
      setSlides([defaultSlides[0]]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeroConfig();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'site_setting_hero_config' || e.key === 'hero_config') {
        loadHeroConfig();
      }
    };
    const handleCustomUpdate = (e: any) => {
      if (e.detail?.key === 'hero_config') {
        if (e.detail.value) {
          try {
            const val = typeof e.detail.value === 'string' ? JSON.parse(e.detail.value) : e.detail.value;
            const allSlides = val.slides || (Array.isArray(val) ? val : []);
            const activeSlides = allSlides.filter((s: any) => s && s.active === true);
            if (activeSlides.length > 0) setSlides(activeSlides);
            if (val.settings) setSettings(val.settings);
          } catch (err) {}
        }
        loadHeroConfig();
      }
    };
    const handleFocus = () => loadHeroConfig();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('site_setting_updated', handleCustomUpdate);
    window.addEventListener('force_refresh_data', handleFocus);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const channel = supabase
      .channel('public_site_settings_hero')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          if (!payload.new || payload.new.key === 'hero_config' || payload.old?.key === 'hero_config') {
            loadHeroConfig();
          }
        }
      )
      .subscribe();

    // Polling interval for fast live sync across tabs/devices
    const syncInterval = setInterval(() => {
      loadHeroConfig();
    }, 4000);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('site_setting_updated', handleCustomUpdate);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => handleNext(), settings.duration * 1000);
    return () => clearInterval(timer);
  }, [slides, currentSlide, settings.duration]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 1500);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 1500);
  };

  return (
    <section id="home" className="relative w-full pt-16 lg:pt-20 pb-2 sm:pb-4 bg-[#070d1a] overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 w-full">
        {/* Slider Aspect Ratio Container */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/9] md:aspect-[2.1/1] lg:aspect-[2.25/1] min-h-[220px] sm:min-h-[280px] max-h-[580px] rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center">
          
          {/* Background Visual Layer */}
          <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center">
            {slides.map((slide, index) => {
              const isVideo = slide.type === 'video' || isVideoUrl(slide.videoUrl, slide.type) || isVideoUrl(slide.image, slide.type);
              const mediaSrc = slide.videoUrl || (isVideoUrl(slide.image, slide.type) ? slide.image : null) || slide.image;
              const posterSrc = slide.poster || (slide.image && slide.image !== mediaSrc ? slide.image : undefined);
              const isCurrent = index === currentSlide;

              return (
                <div
                  key={slide.id || index}
                  className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-[2000ms] ease-in-out ${
                    isCurrent ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                  }`}
                >
                  {/* Ambient Blurred Background Layer */}
                  <div className="absolute inset-0 overflow-hidden w-full h-full">
                    {isVideo ? (
                      <HeroVideoBlur src={mediaSrc} isCurrent={isCurrent} />
                    ) : (
                      <img
                        src={getOptimizedImageUrl(slide.image, 150, 40)}
                        alt=""
                        className="w-full h-full object-cover blur-3xl opacity-80 scale-110 select-none pointer-events-none"
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    )}
                  </div>

                  {/* Main Slide Media */}
                  {isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center z-10">
                      <HeroVideoPlayer src={mediaSrc} poster={posterSrc} isCurrent={isCurrent} />
                    </div>
                  ) : (
                    <img
                      src={getOptimizedImageUrl(slide.image, 1600)}
                      alt={slide.title || "Slide PB Bilibili 162"}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className={`relative w-full h-full object-cover object-center transition-transform duration-[20000ms] ease-out select-none z-10 ${
                        isCurrent ? 'scale-102' : 'scale-100'
                      }`}
                    />
                  )}

                {/* Minimal Bottom Overlay Gradient for clean contrast on dots */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-60% to-black/60 z-20 pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Floating Side Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-xs transition-all active:scale-90"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-xs transition-all active:scale-90"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Slide Indicators: Bottom-center Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2.5 z-30">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => !isTransitioning && setCurrentSlide(index)}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-4 sm:w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Scoped Loading Overlay (Only inside Hero section) */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
      </div>

      <style>{`
        @keyframes scroll-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-scroll-line {
          animation: scroll-line 2.5s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}</style>
    </section>
  );
}