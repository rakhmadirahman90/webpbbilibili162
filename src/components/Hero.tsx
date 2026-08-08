import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase'; 
import { getOptimizedImageUrl } from '../utils/imageOptimizer'; 
import { getSiteSetting } from '../utils/siteSettingsHelper';

export function isVideoUrl(url?: string, type?: string): boolean {
  if (type === 'video') return true;
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
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

  useEffect(() => {
    if (!videoRef.current) return;
    if (isCurrent) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isCurrent]);

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
      className={`w-full h-full object-contain object-center transition-transform duration-[20000ms] ease-out select-none ${
        isCurrent ? 'scale-102' : 'scale-100'
      }`}
    />
  );
}

function HeroVideoBlur({ src, isCurrent }: { src: string; isCurrent: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isCurrent) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isCurrent]);

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

const defaultSlides = [
  { id: 1, image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg' },
  { id: 2, image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg' },
  { id: 3, image: '/whatsapp_image_2026-02-02_at_09.53.05_(2).jpeg' },
  { id: 4, image: '/whatsapp_image_2026-02-02_at_09.53.05_(3).jpeg' },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState(defaultSlides);
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
        const activeSlides = allSlides.filter((s: any) => s.active !== false);
        setSlides(activeSlides.length > 0 ? activeSlides : defaultSlides);
        if (config.settings) {
          setSettings(config.settings);
        }
      }
    } catch (err) {
      console.warn("Error fetching hero data:", err);
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
        loadHeroConfig();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('site_setting_updated', handleCustomUpdate);

    const channel = supabase
      .channel('public_site_settings_hero')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          if (payload.new && payload.new.key === 'hero_config') {
            loadHeroConfig();
          } else {
            loadHeroConfig();
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('site_setting_updated', handleCustomUpdate);
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
              const isVideo = isVideoUrl(slide.image || slide.videoUrl, slide.type);
              const mediaSrc = slide.videoUrl || slide.image;
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
                      <HeroVideoPlayer src={mediaSrc} poster={slide.poster} isCurrent={isCurrent} />
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