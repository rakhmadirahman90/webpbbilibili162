import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase'; 

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

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'hero_config')
          .single();

        if (data?.value) {
          const config = data.value;
          const allSlides = config.slides || (Array.isArray(config) ? config : []);
          const activeSlides = allSlides.filter((s: any) => s.active !== false);
          setSlides(activeSlides.length > 0 ? activeSlides : defaultSlides);
          setSettings(config.settings || { duration: 7 });
        }
      } catch (err) {
        console.warn("Error fetching hero data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeroData();
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

  const scrollToAbout = () => {
    const nextSection = document.getElementById('tentang-kami') || document.getElementById('about');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative w-full mt-14 md:mt-16 aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.2/1] overflow-hidden bg-black flex flex-col items-center justify-center">
      
      {/* Background Visual Layer */}
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id || index}
            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
              index === currentSlide ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            {/* Ambient Blurred Background Layer for Mobile & Wide Ratios */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={slide.image}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-60 scale-110 select-none pointer-events-none"
              />
            </div>

            {/* Main Slide Image:
                Using object-cover to completely and perfectly fit the screen in portrait mode on mobile and wide mode on desktop.
            */}
            <img
              src={slide.image}
              alt=""
              className={`w-full h-full object-cover transition-transform duration-[20000ms] ease-out select-none relative z-10
                ${index === currentSlide ? 'scale-105' : 'scale-100'}
              `}
            />

            {/* Overlay Gradient: Menyediakan kontras untuk teks navigasi bawah */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent via-50% to-black/60 z-20" />
          </div>
        ))}
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

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

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