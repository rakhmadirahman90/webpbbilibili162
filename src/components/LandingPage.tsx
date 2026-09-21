import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Medal, Trophy, Users, Zap, Eye, MessageCircle, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import LazyImage from './LazyImage';
import VideoThumbnail from './VideoThumbnail';

type Athlete = {
  id: string;
  name: string;
  photo: string;
  points: number;
  seed: string;
  category: string;
  rank: number;
};

type GalleryItem = {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string;
  description: string;
};

type NewsItem = {
  id: string;
  judul: string;
  ringkasan: string;
  gambar_url: string;
  tanggal: string;
  views: number;
  comments_count: number;
};

interface LandingPageProps {
  onNavigate?: (sectionId: string, subPath?: string) => void;
}

type LandingCache = {
  athletes: Athlete[];
  allAthletes: Athlete[];
  news: NewsItem[];
  galleryItems: GalleryItem[];
};

let landingCache: LandingCache | null = null;

const FALLBACK_ATHLETES: Athlete[] = [
  { id: 'fallback-1', name: 'PB BILIBILI 162', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 1 },
  { id: 'fallback-2', name: 'KELUARGA BILIBILI 162', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 2 },
  { id: 'fallback-3', name: 'GENERASI JUARA', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 3 },
  { id: 'fallback-4', name: 'NEXT CHAMPION', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 4 },
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [athletes, setAthletes] = useState<Athlete[]>(() => landingCache?.athletes || []);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>(() => landingCache?.allAthletes || []);
  const [news, setNews] = useState<NewsItem[]>(() => landingCache?.news || []);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => landingCache?.galleryItems || []);
  const [featuredAthleteIndex, setFeaturedAthleteIndex] = useState(0);
  const [galleryTab, setGalleryTab] = useState<'image' | 'video'>(() => {
    try {
      return new URLSearchParams(window.location.search).get('galleryTab') === 'video' ? 'video' : 'image';
    } catch {
      return 'image';
    }
  });
  const [loading, setLoading] = useState(() => !landingCache);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('galleryTab')) return;

    let frame = 0;
    let attempts = 0;
    let savedScrollY = 0;
    try {
      savedScrollY = Number(sessionStorage.getItem('pb_landing_gallery_scroll_y') || '0');
    } catch {}

    const restoreGalleryPosition = () => {
      const target = document.getElementById('landing-gallery');
      if (target) {
        window.scrollTo({ top: Math.max(0, savedScrollY), behavior: 'auto' });
        if (attempts < 12) {
          attempts += 1;
          frame = window.requestAnimationFrame(restoreGalleryPosition);
          return;
        }
        try {
          sessionStorage.removeItem('pb_landing_gallery_scroll_y');
          window.setTimeout(() => sessionStorage.removeItem('pb_suppress_landing_popup'), 900);
        } catch {}
        return;
      }
      attempts += 1;
      if (attempts < 60) frame = window.requestAnimationFrame(restoreGalleryPosition);
    };

    frame = window.requestAnimationFrame(restoreGalleryPosition);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('newsId') || params.get('from') !== 'landing') return;

    let savedScrollY = 0;
    try {
      savedScrollY = Number(sessionStorage.getItem('pb_landing_news_scroll_y') || '0');
    } catch {}

    let attempts = 0;
    let frame = 0;
    const restoreNewsPosition = () => {
      window.scrollTo({ top: Math.max(0, savedScrollY), behavior: 'auto' });
      attempts += 1;
      if (attempts < 12) {
        frame = window.requestAnimationFrame(restoreNewsPosition);
        return;
      }
      try {
        sessionStorage.removeItem('pb_landing_news_scroll_y');
        window.setTimeout(() => sessionStorage.removeItem('pb_suppress_landing_popup'), 900);
      } catch {}
    };

    frame = window.requestAnimationFrame(restoreNewsPosition);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let athleteId = '';
    let savedScrollY = 0;
    try {
      if (sessionStorage.getItem('pb_landing_athlete_return') !== '1') return;
      athleteId = sessionStorage.getItem('pb_landing_athlete_id') || '';
      savedScrollY = Number(sessionStorage.getItem('pb_landing_athlete_scroll_y') || '0');
    } catch { return; }

    if (!athleteId || !allAthletes.length) return;

    const index = allAthletes.findIndex((item) => String(item.id) === athleteId);
    if (index >= 0) setFeaturedAthleteIndex(index);

    let frame = 0;
    let attempts = 0;
    const restoreLandingPosition = () => {
      const target = document.getElementById('landing-athletes');

      if (target) {
        // Restore the exact scroll position from the Landing Page instead of
        // scrolling to the top or relying on element offsets that can shift
        // while images/data finish loading.
        window.scrollTo({ top: Math.max(0, savedScrollY), behavior: 'auto' });

        // Re-apply for a few frames so late-loading content cannot push the
        // user back to the top or move the selected section unexpectedly.
        if (attempts < 12) {
          attempts += 1;
          frame = window.requestAnimationFrame(restoreLandingPosition);
          return;
        }

        try {
          sessionStorage.removeItem('pb_landing_athlete_return');
          sessionStorage.removeItem('pb_landing_athlete_id');
          sessionStorage.removeItem('pb_landing_athlete_scroll_y');
          window.setTimeout(() => sessionStorage.removeItem('pb_suppress_landing_popup'), 900);
        } catch {}
        return;
      }

      attempts += 1;
      if (attempts < 60) frame = window.requestAnimationFrame(restoreLandingPosition);
    };

    frame = window.requestAnimationFrame(restoreLandingPosition);
    return () => window.cancelAnimationFrame(frame);
  }, [allAthletes]);

  const goGalleryItem = useCallback((item?: GalleryItem) => {
    if (item?.id) {
      try {
        sessionStorage.setItem('pb_landing_gallery_scroll_y', String(Math.max(0, window.scrollY || window.pageYOffset || 0)));
      } catch {}
    }
    const target = item ? `/galeri?gallery=${encodeURIComponent(item.id)}&from=landing&tab=${item.type}` : '/galeri';
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const goNews = useCallback((newsId?: string) => {
    if (newsId) {
      try {
        sessionStorage.setItem('pb_landing_news_scroll_y', String(Math.max(0, window.scrollY || window.pageYOffset || 0)));
      } catch {}
    }
    const target = newsId
      ? `/?newsId=${encodeURIComponent(newsId)}&from=landing`
      : '/berita';
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const go = useCallback((path: string) => {
    if (onNavigate) onNavigate(path);
    else window.location.href = path === 'home' ? '/' : `/${path}`;
  }, [onNavigate]);

  const goAthleteDetail = useCallback((athlete?: Athlete) => {
    if (!athlete?.id) return;
    try {
      sessionStorage.setItem('pb_landing_athlete_id', String(athlete.id));
      sessionStorage.setItem('pb_landing_athlete_return', '1');
      sessionStorage.setItem('pb_landing_athlete_scroll_y', String(Math.max(0, window.scrollY || window.pageYOffset || 0)));
    } catch {}
    setFeaturedAthleteIndex(Math.max(0, allAthletes.findIndex((item) => String(item.id) === String(athlete.id))));
    go('atlet');
  }, [allAthletes, go]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [playersRes, rankingsRes, statsRes, cup1Res, newsRes, galleryRes] = await Promise.all([
          supabase.from('pendaftaran').select('id,nama,foto_url,kategori,kategori_atlet,bilibili_cup1_photo_path,updated_at').order('nama', { ascending: true }),
          supabase.from('rankings').select('pendaftaran_id,player_name,total_points,photo_url').order('total_points', { ascending: false }),
          supabase.from('atlet_stats').select('pendaftaran_id,points,total_points,seed'),
          supabase.from('v_bilibili_162_cup1_athlete_seeded').select('*'),
          supabase.from('berita').select('id,judul,ringkasan,gambar_url,tanggal,views,comments_count:komentar(count)').order('tanggal', { ascending: false }).limit(7),
          supabase.from('gallery').select('id,title,type,url,thumbnail_url,description').order('created_at', { ascending: false }).limit(12),
        ]);

        const players = playersRes.data || [];
        const rankings = rankingsRes.data || [];
        const stats = statsRes.data || [];
        const cup1Rows = cup1Res.data || [];
        const statsMap = new Map(stats.map((row: any) => [String(row.pendaftaran_id), row]));
        const cup1Map = new Map(cup1Rows.map((row: any) => [String(row.pendaftaran_id), row]));

        const tournamentPhotoById = new Map<string, string>();
        await Promise.all(players.map(async (player: any) => {
          const path = player.bilibili_cup1_photo_path || cup1Map.get(String(player.id))?.photo_path;
          if (!path) return;
          const { data } = await supabase.storage.from('turnamen-dokumen').createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) tournamentPhotoById.set(String(player.id), data.signedUrl);
        }));

        const merged = players.map((player: any) => {
          const ranking = rankings.find((row: any) =>
            (row.pendaftaran_id && String(row.pendaftaran_id) === String(player.id)) ||
            String(row.player_name || '').trim().toLowerCase() === String(player.nama || '').trim().toLowerCase()
          );
          const stat = statsMap.get(String(player.id));
          const points = stat
            ? Number(stat.points || 0) + Number(stat.total_points || 0)
            : Number(ranking?.total_points || 0);

          return {
            id: String(player.id),
            name: player.nama || ranking?.player_name || 'Atlet PB Bilibili 162',
            photo: (() => {
              const currentPhoto = String(player.foto_url || '').trim();
              const tournamentPhoto = tournamentPhotoById.get(String(player.id)) || '';
              const rankingPhoto = String(ranking?.photo_url || '').trim();
              const base = currentPhoto || tournamentPhoto || rankingPhoto;
              if (!base) return '';
              // Bust browser/CDN cache when the athlete record has been updated.
              if (currentPhoto && player.updated_at) {
                const separator = base.includes('?') ? '&' : '?';
                return base + separator + 'v=' + encodeURIComponent(String(player.updated_at));
              }
              return base;
            })(),
            points,
            seed: cup1Map.get(String(player.id))?.seeded_quality || stat?.seed || 'D',
            category: String(player.kategori || player.kategori_atlet || 'SENIOR').toUpperCase().includes('MUDA') ||
              ['U-9','U-11','U-13','U-15','U-17','U-19'].some((u) => String(player.kategori || player.kategori_atlet || '').toUpperCase().includes(u))
              ? 'MUDA' : 'SENIOR',
            rank: 0,
          };
        });

        const sorted = merged.sort((a, b) => b.points - a.points).map((athlete, index) => ({ ...athlete, rank: index + 1 }));
        const newsRows = newsRes.data || [];
        const galleryRows = galleryRes.data || [];
        const formattedGallery = galleryRows.map((item: any) => ({
          id: String(item.id),
          title: item.title || 'Momen PB BILIBILI 162',
          type: item.type === 'video' ? 'video' : 'image',
          url: item.url || item.thumbnail_url || '',
          thumbnail_url: item.thumbnail_url || item.url || '',
          description: item.description || '',
        }));
        const formattedNews = newsRows.map((item: any) => ({
          id: String(item.id),
          judul: item.judul || 'Berita PB Bilibili 162',
          ringkasan: item.ringkasan || '',
          gambar_url: item.gambar_url || '',
          tanggal: item.tanggal || '',
          views: Number(item.views || 0),
          comments_count: Array.isArray(item.comments_count) ? Number(item.comments_count[0]?.count || 0) : 0,
        }));

        if (!mounted) return;
        const nextCache: LandingCache = {
          allAthletes: sorted,
          athletes: sorted.slice(0, 4),
          news: formattedNews,
          galleryItems: formattedGallery,
        };
        landingCache = nextCache;
        setAllAthletes(nextCache.allAthletes);
        setAthletes(nextCache.athletes);
        setNews(nextCache.news);
        setGalleryItems(nextCache.galleryItems);
      } catch (error) {
        console.warn('[LandingPage] homepage data sync skipped:', error);
        if (mounted && !landingCache) {
          setAllAthletes([]);
          setAthletes([]);
          setNews([]);
          setGalleryItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      mounted = false;
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, []);

  const spotlight = useMemo(() => {
    if (athletes.length > 0) return athletes;
    return FALLBACK_ATHLETES;
  }, [athletes]);

  return (
    <div id="landing-page" className="landing-page relative overflow-hidden bg-[#050914] text-white font-sans">
      <section id="landing-news" className="landing-section mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-12 lg:px-10">
        <div className="landing-section-header mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3.5 sm:mb-6 sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-7 w-1 shrink-0 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(37,99,235,.45)] sm:h-8" />
            <h2 className="truncate landing-section-title truncate text-[clamp(1.5rem,5vw,2.25rem)] font-extrabold uppercase leading-[1.05] tracking-[-.035em] text-white">
              Berita <span className="text-blue-500">Terbaru</span>
            </h2>
          </div>
          <button onClick={() => goNews()} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-600 hover:text-white sm:flex">
            Semua Berita <ArrowRight size={14} />
          </button>
        </div>

        {news.length > 0 ? (
          <div>
            {(() => {
              const featuredTitle = 'PB BILIBILI 162 CUP I TAHUN 2026 RESMI DITUTUP WALI KOTA PAREPARE, LAHIRKAN PARA JUARA PENUH SPORTIVITAS';
              // Jadikan berita penutupan BILIBILI 162 CUP I sebagai berita utama
              // secara eksplisit, tanpa bergantung pada urutan tanggal berita.
              const featuredIndex = news.findIndex((item) =>
                String(item.judul || '').trim().toLowerCase() === featuredTitle.toLowerCase()
              );
              const featured = featuredIndex >= 0 ? news[featuredIndex] : news[0];
              const others = news
                .filter((_, index) => index !== (featuredIndex >= 0 ? featuredIndex : 0))
                .slice(0, 4);
              const image = String(featured.gambar_url || '').split(/[,\s]+/)[0];
              return (
                <>
                  <button
                    onClick={() => goNews(featured.id)}
                    className="group block w-full overflow-hidden rounded-[1.25rem] sm:rounded-[2rem] border border-white/10 bg-[#0b1220] text-left shadow-2xl"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 sm:aspect-[2.05/1]">
                      {image ? (
                        <LazyImage
                          src={image}
                          alt={featured.judul}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                          containerClassName="h-full w-full"
                          width={1200}
                        />
                      ) : <div className="h-full w-full bg-[#111827]" />}
                    </div>
                    <div className="bg-gradient-to-r from-[#0b3b91] via-[#1557d6] to-[#2563eb] px-4 py-4 sm:px-7 sm:py-6">
                      <div className="mb-2 inline-flex rounded-full bg-blue-600 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-white">
                        Berita Terbaru
                      </div>
                      <h3 className="text-[clamp(1.15rem,3.2vw,2rem)] font-extrabold leading-[1.16] tracking-[-.02em] text-white">{featured.judul}</h3>
                      <p className="mt-2.5 line-clamp-2 text-[12px] leading-[1.55] text-white/80 sm:text-sm">{featured.ringkasan}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold uppercase tracking-wider text-white/80 sm:text-[9px]">
                          <span>{featured.tanggal ? new Date(featured.tanggal).toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) : 'Terbaru'}</span>
                          <span className="inline-flex items-center gap-1"><Eye size={12}/> {featured.views}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle size={12}/> {featured.comments_count}</span>
                        </div>
                        <span className="hidden items-center gap-2 text-sm font-black text-white sm:inline-flex">Baca Selengkapnya <ArrowRight size={16}/></span>
                      </div>
                    </div>
                  </button>

                  <div className="mt-3 overflow-hidden rounded-[1.25rem] sm:rounded-[2rem] border border-white/10 bg-[#0b1220]">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Berita Lainnya</div>
                      <button onClick={() => goNews()} className="hidden items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-400 sm:flex">Lihat Semua Berita <ArrowRight size={13}/></button>
                    </div>
                    <div className="divide-y divide-white/10">
                      {others.map((item) => {
                        const itemImage = item.gambar_url.split(/[,\s]+/)[0];
                        return (
                          <button key={item.id} onClick={() => goNews(item.id)} className="group flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[.04] sm:gap-5 sm:p-4">
                            <div className="h-[76px] w-[106px] shrink-0 overflow-hidden rounded-2xl bg-slate-800 sm:h-[88px] sm:w-[128px]">
                              {itemImage ? <LazyImage src={itemImage} alt={item.judul} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" containerClassName="h-full w-full" width={360} /> : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-[13px] font-black leading-[1.3] text-white group-hover:text-blue-300 sm:text-[15px]">{item.judul}</h3>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] font-bold uppercase tracking-wider text-slate-500 sm:text-[9px]">
                                <span>{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) : 'Terbaru'}</span>
                                <span className="inline-flex items-center gap-1"><Eye size={10}/> {item.views}</span>
                                <span className="inline-flex items-center gap-1"><MessageCircle size={10}/> {item.comments_count}</span>
                              </div>
                            </div>
                            <ChevronRight size={20} className="shrink-0 text-slate-500 transition group-hover:text-blue-400" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button onClick={() => goNews()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-[10px] font-black uppercase tracking-[.16em] text-white shadow-lg shadow-blue-600/15 sm:hidden">
                    Berita Lainnya / Selengkapnya <ArrowRight size={14} />
                  </button>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-[#0b1220] px-5 py-14 text-center text-[11px] font-black uppercase tracking-[.16em] text-slate-500">Belum ada berita terbaru.</div>
        )}
      </section>

      <section id="landing-athletes" className="landing-section mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-12 lg:px-10">
        <div className="landing-section-header mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3.5 sm:mb-6 sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-7 w-1 shrink-0 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(37,99,235,.45)] sm:h-8" />
            <h2 className="landing-section-title">Kenali Atlet Kami</h2>
          </div>
          <button onClick={() => go('atlet')} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-600 hover:text-white sm:flex">
            Semua Atlet <ArrowRight size={14} />
          </button>
        </div>

        {(() => {
          const roster = allAthletes.length > 0 ? allAthletes : spotlight;
          const featured = roster[Math.min(featuredAthleteIndex, Math.max(roster.length - 1, 0))];
          const gallery = roster.slice(0, 6);
          if (!featured) {
            return (
              <div className="rounded-[2rem] border border-white/10 bg-[#0b1220] px-5 py-14 text-center text-[11px] font-black uppercase tracking-[.16em] text-slate-500">
                Data atlet sedang disinkronkan.
              </div>
            );
          }
          return (
            <div className="overflow-hidden rounded-[1.25rem] sm:rounded-[2rem] border border-white/10 bg-[#090d14] shadow-2xl">
              <button onClick={() => goAthleteDetail(featured)} className="group block w-full text-left">
                <div className="relative aspect-[1.15/1] w-full overflow-hidden bg-[#1d1d1d] sm:aspect-[2.1/1]">
                  {featured.photo ? (
                    <LazyImage
                      src={featured.photo}
                      alt={featured.name}
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.015]"
                      containerClassName="h-full w-full"
                      width={1400}
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(37,99,235,.28),transparent_48%),#171b22]">
                      <Users size={72} className="text-blue-500/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/5" />
                </div>
                <div className="bg-[#05070b] px-4 py-4 sm:px-8 sm:py-6">
                  <div className="text-[9px] font-black uppercase tracking-[.22em] text-slate-400">Kenal Lebih Dekat</div>
                  <div className="mt-2 text-[clamp(1.35rem,4vw,2rem)] font-extrabold uppercase leading-[1.05] tracking-[-.025em] text-white">{featured.name}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-blue-300">
                    <span>{featured.category}</span>
                    <span className="text-slate-600">•</span>
                    <span>Seed {featured.seed}</span>
                    <span className="text-slate-600">•</span>
                    <span>{featured.points.toLocaleString()} Points</span>
                  </div>
                </div>
              </button>

              <div className="border-t border-white/10 bg-[#171717] px-4 py-4 sm:px-7 sm:py-5">
                <div className="mb-3.5 flex items-center justify-between gap-3">
                  <div className="text-[17px] font-extrabold uppercase tracking-[-.02em] text-white sm:text-xl">Profil Atlet</div>
                  <button onClick={() => go('atlet')} className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-300 transition hover:text-blue-400 sm:text-xs">
                    Lihat Galeri Atlet
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {gallery.map((athlete, index) => (
                    <button
                      key={athlete.id}
                      onClick={() => goAthleteDetail(athlete)}
                      className={`group relative aspect-[.82] overflow-hidden rounded-xl border transition sm:rounded-2xl ${index === featuredAthleteIndex ? 'border-blue-500 ring-2 ring-blue-500/25' : 'border-white/10 hover:border-blue-400/60'}`}
                    >
                      {athlete.photo ? (
                        <LazyImage src={athlete.photo} alt={athlete.name} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" containerClassName="h-full w-full" width={320} />
                      ) : (
                        <div className="grid h-full place-items-center bg-[#0b1220]"><Users size={28} className="text-blue-500/30" /></div>
                      )}
                      <div className={`absolute inset-0 transition ${index === featuredAthleteIndex ? 'bg-gradient-to-t from-blue-950/75 via-transparent to-transparent' : 'bg-gradient-to-t from-black/75 via-black/5 to-transparent'}`} />
                      <div className={`absolute inset-x-2 bottom-2 line-clamp-1 text-left text-[9px] font-black uppercase tracking-[.04em] ${index === featuredAthleteIndex ? 'text-blue-200' : 'text-white'}`}>{athlete.name}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => go('atlet')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-300 transition hover:border-blue-500/40 hover:text-white">
                  Buka Profil & Data Atlet Lengkap <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      <section id="landing-gallery" className="landing-section bg-[#111827]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12 lg:px-10">
          <div className="landing-section-header mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3.5 sm:mb-5 sm:pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-7 w-1 shrink-0 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(37,99,235,.45)] sm:h-8" />
              <h2 className="landing-section-title text-[clamp(1.5rem,5vw,2.25rem)] font-extrabold uppercase leading-[1.05] tracking-[-.035em] text-white">Galeri</h2>
            </div>
            <button onClick={() => go('galeri')} className="shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-600 hover:text-white">Semua Media</button>
          </div>

          <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#1b2433]">
            <button
              onClick={() => setGalleryTab('image')}
              className={`px-4 py-3.5 text-[11px] font-black uppercase tracking-[.12em] transition sm:py-4 ${galleryTab === 'image' ? 'bg-blue-600 text-white' : 'text-white/75 hover:bg-white/10'}`}
            >
              Foto Terbaru
            </button>
            <button
              onClick={() => setGalleryTab('video')}
              className={`px-4 py-3.5 text-[11px] font-black uppercase tracking-[.12em] transition sm:py-4 ${galleryTab === 'video' ? 'bg-blue-600 text-white' : 'text-white/75 hover:bg-white/10'}`}
            >
              Video Terbaru
            </button>
          </div>

          {(() => {
            const selected = galleryItems.filter(item => item.type === galleryTab)[0];
            const isVideo = galleryTab === 'video';

            return selected ? (
              <button onClick={() => goGalleryItem(selected)} className="group block w-full overflow-hidden rounded-xl bg-black text-left">
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  {isVideo ? (
                    <VideoThumbnail
                      src={selected.url}
                      thumbnailUrl={selected.thumbnail_url}
                      alt={selected.title || 'Video terbaru PB BILIBILI 162'}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <LazyImage
                      src={selected.url}
                      alt={selected.title || 'Foto terbaru PB BILIBILI 162'}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                      containerClassName="h-full w-full"
                      width={1400}
                    />
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 grid place-items-center bg-black/20">
                      <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-600 text-white shadow-2xl">
                        <Play size={25} fill="currentColor" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-4 py-4">
                  <div className="text-[9px] font-black uppercase tracking-[.18em] text-blue-400">
                    {isVideo ? 'Video Terbaru' : 'Foto Terbaru'}
                  </div>
                  <div className="mt-1 text-[clamp(1rem,2.4vw,1.25rem)] font-extrabold leading-[1.3] tracking-[-.01em] text-white">{selected.title || 'Momen PB BILIBILI 162'}</div>
                  {selected.description && <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-slate-400">{selected.description}</p>}
                </div>
              </button>
            ) : (
              <div className="rounded-xl bg-black px-5 py-16 text-center text-sm font-semibold text-slate-500">
                {isVideo ? 'Belum ada video terbaru.' : 'Belum ada foto terbaru.'}
              </div>
            );
          })()}
        </div>
      </section>

      <style>{`/* Production sync: restore ea1f64b landing news layout */
/* Landing typography/layout deployment sync: 2026-09-21 */
/* Vercel production sync checkpoint: 2026-09-21-2 */

        #landing-page {
          --landing-blue:#2563eb;
          --landing-bg:#050914;
          --landing-surface:#0b1220;
          --landing-surface-2:#111827;
          --landing-border:rgba(255,255,255,.10);
          --landing-muted:#94a3b8;
          --landing-title:clamp(1.5rem,5vw,2.25rem);
          --landing-body:clamp(.8125rem,1.4vw,.9375rem);
          --landing-meta:clamp(.625rem,1vw,.6875rem);
          --landing-control:clamp(.6875rem,1.1vw,.75rem);
          font-family:"Plus Jakarta Sans","Inter",sans-serif;
          font-variant-numeric:tabular-nums;
          background:var(--landing-bg);
          color:#fff;
          letter-spacing:0;
        }

        #landing-page,
        #landing-page button,
        #landing-page h1,
        #landing-page h2,
        #landing-page h3,
        #landing-page p,
        #landing-page span {
          font-family:"Plus Jakarta Sans","Inter",sans-serif;
        }

        #landing-page .landing-section {
          scroll-margin-top:80px;
          background:var(--landing-bg);
          width:100%;
        }

        #landing-page .landing-section > div,
        #landing-page .landing-section > section {
          box-sizing:border-box;
        }

        #landing-page .landing-section-header {
          min-height:42px;
          margin-bottom:24px;
          padding-bottom:14px;
          border-color:var(--landing-border);
        }

        #landing-page .landing-section-title,
        #landing-page .landing-section-header h2 {
          font-size:var(--landing-title) !important;
          line-height:1.05 !important;
          font-weight:800 !important;
          letter-spacing:-.035em !important;
          text-wrap:balance;
        }

        #landing-page .landing-section-header button,
        #landing-page .landing-section-header + button,
        #landing-page .landing-section-header + div button {
          font-size:var(--landing-control) !important;
          line-height:1.1 !important;
          font-weight:800 !important;
          letter-spacing:.08em !important;
          white-space:nowrap;
        }

        /* One typography scale for content across all three landing sections. */
        #landing-page #landing-news h3 {
          font-size:clamp(.9375rem,2.5vw,2rem) !important;
          line-height:1.2 !important;
          font-weight:800 !important;
        }
        #landing-page #landing-news p {
          font-size:var(--landing-body) !important;
          line-height:1.55 !important;
        }
        #landing-page #landing-news .text-\\[8px\\],
        #landing-page #landing-news .text-\\[9px\\] {
          font-size:var(--landing-meta) !important;
          line-height:1.35 !important;
        }
        #landing-page #landing-news > div > div:last-child > div:first-child {
          line-height:1.2;
        }

        #landing-page #landing-athletes .text-\\[9px\\] {
          font-size:var(--landing-meta) !important;
          line-height:1.3 !important;
        }
        #landing-page #landing-athletes .text-\\[10px\\] {
          font-size:var(--landing-meta) !important;
          line-height:1.35 !important;
        }

        #landing-page #landing-gallery > div {
          width:100%;
        }
        #landing-page #landing-gallery > div > div.grid button {
          font-size:var(--landing-control) !important;
          line-height:1.2 !important;
          font-weight:800 !important;
          letter-spacing:.1em !important;
        }
        #landing-page #landing-gallery > div > button.group > div:last-child {
          font-size:var(--landing-body) !important;
        }

        #landing-page p {
          line-height:1.55;
        }

        #landing-page .landing-section-header button {
          line-height:1.1;
          white-space:nowrap;
        }

        #landing-page button {
          -webkit-tap-highlight-color:transparent;
        }

        #landing-page #landing-gallery {
          background:var(--landing-bg);
        }

        @media (min-width: 641px) {
          #landing-page #landing-news,
          #landing-page #landing-athletes,
          #landing-page #landing-gallery {
            padding-top:48px !important;
            padding-bottom:48px !important;
          }
          #landing-page .landing-section-header {
            margin-bottom:24px;
          }
        }

        @media (max-width: 640px) {
          #landing-page .landing-section { scroll-margin-top:76px; }
          #landing-page #landing-news,
          #landing-page #landing-athletes,
          #landing-page #landing-gallery {
            padding:28px 16px !important;
          }
          #landing-page .landing-section-header {
            min-height:40px;
            margin-bottom:18px;
            padding-bottom:12px;
          }
          #landing-page .landing-section h2 { text-wrap:balance; }
          #landing-page #landing-news .divide-y > button { min-height:92px; }
          #landing-page #landing-athletes .grid-cols-3 { gap:8px; }
          #landing-page #landing-athletes .grid-cols-3 > button { min-width:0; }
          #landing-page #landing-gallery button { touch-action:manipulation; }
          #landing-page #landing-gallery > div > button.group { border-radius:16px; }
          #landing-page #landing-gallery p { line-height:1.55; }
        }

        @media (max-width: 380px) {
          #landing-page #landing-news,
          #landing-page #landing-athletes,
          #landing-page #landing-gallery {
            padding-left:14px !important;
            padding-right:14px !important;
          }
          #landing-page .landing-section-title,
          #landing-page .landing-section-header h2 {
            font-size:24px !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          #landing-page *, #landing-page *::before, #landing-page *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
        }
        @media (max-width: 640px) {
          #landing-page .landing-hero { min-height:calc(100svh - 58px); }
          #landing-page .landing-hero > div:nth-child(2) { min-height:calc(100svh - 58px); }

          #landing-page .landing-section { scroll-margin-top:76px; }
          #landing-page #landing-news,
          #landing-page #landing-athletes,
          #landing-page #landing-gallery {
            padding-top:24px !important;
            padding-bottom:24px !important;
          }
          #landing-page .landing-section h2 { text-wrap:balance; }
          #landing-page button { -webkit-tap-highlight-color:transparent; }
          #landing-page #landing-athletes .grid-cols-3 { gap:7px; }
          #landing-page #landing-athletes .grid-cols-3 > button { min-width:0; }
          #landing-page #landing-gallery button { touch-action:manipulation; }
          #landing-page #landing-gallery > div > button.group { border-radius:16px; }
          #landing-page #landing-gallery p { line-height:1.55; }
        }
      `}</style>
    </div>
  );
}
