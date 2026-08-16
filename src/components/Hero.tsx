import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, appendCacheBustParam } from '../utils/siteSettingsHelper';

const SUPABASE_STORAGE = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public';
const HERO_VIDEO = `${SUPABASE_STORAGE}/assets/hero-sliders/hero-video-1786206060056.webm`;
const HERO_POSTER = `${SUPABASE_STORAGE}/assets/hero-sliders/hero-poster-1786206060056.webp`;
const WAWAN_PHOTO = `${SUPABASE_STORAGE}/identitas-atlet/identitas/1775222807673-ccq2ee.jpg`;

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

export const defaultSlides = [
  { id: 'pb162-video-previous', title: 'PB BILIBILI 162', subtitle: 'PROFESSIONAL CLUB', image: HERO_VIDEO, videoUrl: HERO_VIDEO, poster: HERO_POSTER, type: 'video', active: true },
  { id: 'ketua-wawan-real', title: 'H. Wawan', subtitle: 'Ketua Umum PB Bilibili 162', image: WAWAN_PHOTO, type: 'image', active: true }
];

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

  if (failed) return <img src={poster} alt="PB Bilibili 162" className="w-full h-full object-cover object-center" />;
  return (
    <div className="relative w-full h-full bg-black">
      <img src={poster} alt="PB Bilibili 162" className="absolute inset-0 w-full h-full object-cover object-center" />
      <video ref={videoRef} src={src} poster={poster} autoPlay loop muted playsInline controls={false} preload="auto" onError={() => setFailed(true)} className="relative z-10 w-full h-full object-cover object-center">
        <source src={src} type="video/webm" />
      </video>
    </div>
  );
}

async function loadWawanPhoto() {
  try {
    const { data, error } = await supabase.from('pendaftaran').select('id, nama, foto_url').ilike('nama', '%Wawan%').not('foto_url', 'is', null).limit(10);
    if (error || !data?.length) return WAWAN_PHOTO;
    const member = data.find((row: any) => String(row.nama || '').trim().toLowerCase() === 'h. wawan') || data.find((row: any) => String(row.nama || '').toLowerCase().includes('wawan'));
    const url = String(member?.foto_url || '').trim().split(/[\s,]+/)[0];
    return url || WAWAN_PHOTO;
  } catch { return WAWAN_PHOTO; }
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [wawanPhoto, setWawanPhoto] = useState(WAWAN_PHOTO);
  const [duration, setDuration] = useState(7);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadWawanPhoto(), getSiteSetting('hero_config').catch(() => null)]).then(([photo, config]) => {
      if (!mounted) return;
      if (photo) setWawanPhoto(photo);
      const configured = Number(config?.settings?.duration);
      if (Number.isFinite(configured) && configured >= 5) setDuration(configured);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentSlide((prev) => (prev + 1) % 2), duration * 1000);
    return () => window.clearInterval(timer);
  }, [duration]);

  const goTo = (index: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setCurrentSlide(index);
    window.setTimeout(() => setTransitioning(false), 500);
  };
  const next = () => goTo((currentSlide + 1) % 2);
  const prev = () => goTo((currentSlide - 1 + 2) % 2);

  const slides = [defaultSlides[0], { ...defaultSlides[1], image: wawanPhoto, updated_at: wawanPhoto }];

  return (
    <section id="home" className="relative w-full pt-16 lg:pt-20 pb-2 sm:pb-4 bg-[#070d1a] overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 w-full">
        <div className="relative w-full aspect-[16/9] md:aspect-[2.1/1] lg:aspect-[2.25/1] min-h-[220px] sm:min-h-[280px] max-h-[580px] rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-black">
          {slides.map((slide, index) => {
            const active = index === currentSlide;
            const imageUrl = appendCacheBustParam(slide.image, slide.updated_at || slide.id);
            return <div key={slide.id} className={`absolute inset-0 transition-opacity duration-500 ${active ? 'opacity-100 visible z-10' : 'opacity-0 invisible z-0 pointer-events-none'}`}>
              {slide.type === 'video' ? <HeroVideo src={imageUrl} poster={HERO_POSTER} active={active} /> : <img src={imageUrl} alt="H. Wawan - Ketua Umum PB Bilibili 162" className="w-full h-full object-cover object-center" loading={index === 1 ? 'eager' : 'lazy'} decoding="async" onError={(event) => { if (event.currentTarget.src !== WAWAN_PHOTO) event.currentTarget.src = WAWAN_PHOTO; }} />}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45 pointer-events-none" />
            </div>;
          })}
          <button onClick={prev} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/35 hover:bg-black/60 text-white transition-all" aria-label="Previous slide"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          <button onClick={next} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/35 hover:bg-black/60 text-white transition-all" aria-label="Next slide"><ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-30">{slides.map((slide, index) => <button key={slide.id} onClick={() => goTo(index)} className={`h-1.5 rounded-full transition-all ${index === currentSlide ? 'w-7 bg-blue-500' : 'w-2 bg-white/50'}`} aria-label={`Go to slide ${index + 1}`} />)}</div>
        </div>
      </div>
    </section>
  );
}
