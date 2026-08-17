import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { appendCacheBustParam } from '../utils/siteSettingsHelper';

type HeroSlide = {
  id: string | number;
  title?: string;
  subtitle?: string;
  image?: string;
  videoUrl?: string;
  poster?: string;
  type?: 'image' | 'video' | string;
  active?: boolean;
  updated_at?: string | number;
  [key: string]: unknown;
};

export function isVideoUrl(url?: string, type?: string): boolean {
  if (type === 'video') return true;
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.startsWith('data:video/') || clean.startsWith('blob:') ||
    clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') ||
    clean.endsWith('.ogg') || clean.endsWith('.m4v') || clean.includes('video/') ||
    clean.includes('hero-video') || clean.includes('.mp4') || clean.includes('.webm') ||
    clean.includes('youtube.com') || clean.includes('youtu.be') || clean.includes('vimeo.com');
}

function parseHeroValue(value: any): { slides: HeroSlide[]; duration: number } {
  const parsed = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return {}; } })() : value || {};
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : Array.isArray(parsed) ? parsed : [];
  const slides = rawSlides
    .filter((slide: any) => slide && slide.id !== undefined && (slide.image || slide.videoUrl) && slide.active !== false)
    .map((slide: any) => {
      const mediaUrl = String(slide.videoUrl || slide.image || '');
      const type = isVideoUrl(mediaUrl, slide.type) ? 'video' : 'image';
      return { ...slide, id: String(slide.id), type, active: true } as HeroSlide;
    });
  const configuredDuration = Number(parsed.settings?.duration);
  return {
    slides,
    duration: Number.isFinite(configuredDuration) && configuredDuration >= 5 ? configuredDuration : 7,
  };
}

async function fetchHeroConfig(): Promise<{ slides: HeroSlide[]; duration: number }> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value, updated_at')
    .eq('key', 'hero_config')
    .maybeSingle();

  if (error) throw error;
  return parseHeroValue(data?.value);
}

function HeroVideo({ src, poster, active }: { src: string; poster?: string; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    if (active && !failed) {
      video.load();
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, failed, src]);

  if (failed) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white/60 text-xs uppercase tracking-widest">
        Video Hero tidak dapat dimuat
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {poster && <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />}
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
        onError={() => setFailed(true)}
        className="relative z-10 w-full h-full object-cover object-center"
      />
    </div>
  );
}

export default function Hero() {
  // Never seed the landing page with hard-coded hero media. Supabase is authoritative.
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(true);
  const currentSlideRef = useRef(0);
  const slidesRef = useRef<HeroSlide[]>([]);

  const applyHeroConfig = (config: { slides: HeroSlide[]; duration: number }) => {
    slidesRef.current = config.slides;
    setSlides(config.slides);
    setDuration(config.duration);
    setCurrentSlide(prev => Math.min(prev, Math.max(0, config.slides.length - 1)));
  };

  const refreshHero = async () => {
    try {
      const config = await fetchHeroConfig();
      applyHeroConfig(config);
    } catch (error) {
      // Keep the currently rendered Supabase data if a realtime refresh temporarily fails.
      console.warn('[Hero] Supabase refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchHeroConfig()
      .then(config => { if (mounted) applyHeroConfig(config); })
      .catch(error => {
        console.error('[Hero] Initial Supabase load failed:', error);
        // Important: do NOT restore old/default images when Supabase fails.
        if (mounted) setSlides([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    const channel = supabase
      .channel('landing_hero_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.hero_config' }, () => void refreshHero())
      .subscribe();

    const handleSettingUpdate = (event: Event) => {
      if ((event as CustomEvent).detail?.key === 'hero_config') void refreshHero();
    };
    window.addEventListener('site_setting_updated', handleSettingUpdate);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleSettingUpdate);
    };
  }, []);

  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      const count = slidesRef.current.length;
      if (count > 1) setCurrentSlide(prev => (prev + 1) % count);
    }, duration * 1000);
    return () => window.clearInterval(timer);
  }, [duration, slides.length]);

  const goTo = (index: number) => {
    if (!slides.length) return;
    const nextIndex = (index + slides.length) % slides.length;
    currentSlideRef.current = nextIndex;
    setCurrentSlide(nextIndex);
  };
  const next = () => goTo(currentSlideRef.current + 1);
  const prev = () => goTo(currentSlideRef.current - 1);

  return (
    <section id="home" className="relative w-full pt-16 lg:pt-20 pb-2 sm:pb-4 bg-[#070d1a] overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 w-full">
        <div className="relative w-full aspect-[16/9] md:aspect-[2.1/1] lg:aspect-[2.25/1] min-h-[220px] sm:min-h-[280px] max-h-[580px] rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-black">
          {loading && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black text-white/50 text-xs uppercase tracking-widest">Memuat Hero dari Supabase...</div>}
          {!loading && slides.length === 0 && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black text-white/40 text-xs uppercase tracking-widest">Belum ada Hero aktif</div>}

          {slides.map((slide, index) => {
            const active = index === currentSlide;
            const imageSource = slide.videoUrl || slide.image || '';
            const imageUrl = appendCacheBustParam(imageSource, slide.updated_at || slide.id);
            const posterUrl = slide.poster ? appendCacheBustParam(String(slide.poster), slide.updated_at || slide.id) : undefined;
            return (
              <div key={String(slide.id)} className={`absolute inset-0 transition-opacity duration-500 ${active ? 'opacity-100 visible z-10' : 'opacity-0 invisible z-0 pointer-events-none'}`}>
                {slide.type === 'video'
                  ? <HeroVideo src={imageUrl} poster={posterUrl} active={active} />
                  : <img src={imageUrl} alt={slide.title || 'PB Bilibili 162'} className="w-full h-full object-cover object-center" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45 pointer-events-none" />
              </div>
            );
          })}

          {slides.length > 1 && <>
            <button onClick={prev} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/35 hover:bg-black/60 text-white transition-all" aria-label="Previous slide"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            <button onClick={next} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/35 hover:bg-black/60 text-white transition-all" aria-label="Next slide"><ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-30">{slides.map((slide, index) => <button key={String(slide.id)} onClick={() => goTo(index)} className={`h-1.5 rounded-full transition-all ${index === currentSlide ? 'w-7 bg-blue-500' : 'w-2 bg-white/50'}`} aria-label={`Go to slide ${index + 1}`} />)}</div>
          </>}
        </div>
      </div>
    </section>
  );
}
