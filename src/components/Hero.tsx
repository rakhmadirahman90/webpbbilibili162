import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { appendCacheBustParam } from '../utils/siteSettingsHelper';

const SUPABASE_STORAGE = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public';
const HERO_VIDEO = `${SUPABASE_STORAGE}/assets/hero-sliders/hero-video-1786206060056.webm`;
const HERO_POSTER = `${SUPABASE_STORAGE}/assets/hero-sliders/hero-poster-1786206060056.webp`;
const WAWAN_PHOTO = `${SUPABASE_STORAGE}/identitas-atlet/identitas/1775222807673-ccq2ee.jpg`;

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

export const defaultSlides: HeroSlide[] = [
  { id: 'pb162-video-previous', title: 'PB BILIBILI 162', subtitle: 'PROFESSIONAL CLUB', image: HERO_VIDEO, videoUrl: HERO_VIDEO, poster: HERO_POSTER, type: 'video', active: true },
  { id: 'ketua-wawan-real', title: 'H. Wawan', subtitle: 'Ketua Umum PB Bilibili 162', image: WAWAN_PHOTO, type: 'image', active: true }
];

function normalizeSlides(value: any): HeroSlide[] {
  const raw = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return null; } })() : value;
  const configured = Array.isArray(raw?.slides) ? raw.slides : Array.isArray(raw) ? raw : [];
  const slides = configured
    .filter((slide: any) => slide && slide.id !== undefined && slide.image)
    .map((slide: any) => ({
      ...slide,
      id: String(slide.id),
      type: isVideoUrl(String(slide.videoUrl || slide.image || ''), slide.type) ? 'video' : 'image',
      active: slide.active !== false,
    })) as HeroSlide[];

  const active = slides.filter(slide => slide.active !== false);
  return active.length ? active : defaultSlides;
}

function HeroVideo({ src, poster, active }: { src: string; poster: string; active: boolean }) {
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
    } else video.pause();
  }, [active, failed, src]);

  if (failed) return <img src={poster || HERO_POSTER} alt="PB Bilibili 162" className="w-full h-full object-cover object-center" />;
  return (
    <div className="relative w-full h-full bg-black">
      <img src={poster || HERO_POSTER} alt="PB Bilibili 162" className="absolute inset-0 w-full h-full object-cover object-center" />
      <video ref={videoRef} src={src} poster={poster || HERO_POSTER} autoPlay loop muted playsInline controls={false} preload="auto" onError={() => setFailed(true)} className="relative z-10 w-full h-full object-cover object-center" />
    </div>
  );
}

async function fetchHeroConfig(): Promise<{ slides: HeroSlide[]; duration: number }> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value, updated_at')
    .eq('key', 'hero_config')
    .maybeSingle();

  if (error) throw error;
  const value = data?.value ?? null;
  const slides = normalizeSlides(value);
  const configured = Number((value as any)?.settings?.duration);
  const duration = Number.isFinite(configured) && configured >= 5 ? configured : 7;
  return { slides, duration };
}

async function loadWawanPhoto() {
  try {
    const { data, error } = await supabase.from('pendaftaran').select('id, nama, foto_url').ilike('nama', '%Wawan%').not('foto_url', 'is', null).limit(10);
    if (error || !data?.length) return WAWAN_PHOTO;
    const member = data.find((row: any) => String(row.nama || '').trim().toLowerCase() === 'h. wawan') || data.find((row: any) => String(row.nama || '').toLowerCase().includes('wawan'));
    return String(member?.foto_url || '').trim().split(/[\s,]+/)[0] || WAWAN_PHOTO;
  } catch { return WAWAN_PHOTO; }
}

export default function Hero() {
  const [slides, setSlides] = useState<HeroSlide[]>(defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [duration, setDuration] = useState(7);
  const [transitioning, setTransitioning] = useState(false);
  const currentSlideRef = useRef(0);
  const slidesRef = useRef<HeroSlide[]>(defaultSlides);

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
      console.warn('[Hero] Supabase realtime refresh failed:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([loadWawanPhoto(), fetchHeroConfig()]).then(([photo, config]) => {
      if (!mounted) return;
      if (photo) {
        setSlides(current => current.map(slide => slide.id === 'ketua-wawan-real' ? { ...slide, image: photo } : slide));
      }
      applyHeroConfig(config);
    }).catch(() => {
      if (mounted) setSlides(defaultSlides);
    });

    const channel = supabase
      .channel('landing_hero_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.hero_config' }, () => {
        void refreshHero();
      })
      .subscribe();

    const handleSettingUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.key === 'hero_config') void refreshHero();
    };
    window.addEventListener('site_setting_updated', handleSettingUpdate);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleSettingUpdate);
    };
  }, []);

  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      const count = slidesRef.current.length;
      if (count > 1) setCurrentSlide(prev => (prev + 1) % count);
    }, duration * 1000);
    return () => window.clearInterval(timer);
  }, [duration, slides.length]);

  const goTo = (index: number) => {
    if (transitioning || !slides.length) return;
    const nextIndex = (index + slides.length) % slides.length;
    setTransitioning(true);
    currentSlideRef.current = nextIndex;
    setCurrentSlide(nextIndex);
    window.setTimeout(() => setTransitioning(false), 500);
  };
  const next = () => goTo(currentSlideRef.current + 1);
  const prev = () => goTo(currentSlideRef.current - 1);

  return (
    <section id="home" className="relative w-full pt-16 lg:pt-20 pb-2 sm:pb-4 bg-[#070d1a] overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 w-full">
        <div className="relative w-full aspect-[16/9] md:aspect-[2.1/1] lg:aspect-[2.25/1] min-h-[220px] sm:min-h-[280px] max-h-[580px] rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-black">
          {slides.map((slide, index) => {
            const active = index === currentSlide;
            const imageSource = slide.videoUrl || slide.image || '';
            const imageUrl = appendCacheBustParam(imageSource, slide.updated_at || slide.id);
            const posterUrl = appendCacheBustParam(slide.poster || HERO_POSTER, slide.updated_at || slide.id);
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
