import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Medal, Trophy, Users, Zap, Eye, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import LazyImage from './LazyImage';

type Athlete = {
  id: string;
  name: string;
  photo: string;
  points: number;
  seed: string;
  category: string;
  rank: number;
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

const FALLBACK_ATHLETES: Athlete[] = [
  { id: 'fallback-1', name: 'PB BILIBILI 162', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 1 },
  { id: 'fallback-2', name: 'KELUARGA BILIBILI 162', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 2 },
  { id: 'fallback-3', name: 'GENERASI JUARA', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 3 },
  { id: 'fallback-4', name: 'NEXT CHAMPION', photo: '', points: 0, seed: '—', category: 'ATLET', rank: 4 },
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [featuredAthleteIndex, setFeaturedAthleteIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const goNews = useCallback((newsId?: string) => {
    const target = newsId ? `/berita?newsId=${encodeURIComponent(newsId)}` : '/berita';
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const go = useCallback((path: string) => {
    if (onNavigate) onNavigate(path);
    else window.location.href = path === 'home' ? '/' : `/${path}`;
  }, [onNavigate]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [playersRes, rankingsRes, statsRes, cup1Res, newsRes] = await Promise.all([
          supabase.from('pendaftaran').select('id,nama,foto_url,kategori,kategori_atlet,bilibili_cup1_photo_path').order('nama', { ascending: true }),
          supabase.from('rankings').select('pendaftaran_id,player_name,total_points,photo_url').order('total_points', { ascending: false }),
          supabase.from('atlet_stats').select('pendaftaran_id,points,total_points,seed'),
          supabase.from('v_bilibili_162_cup1_athlete_seeded').select('*'),
          supabase.from('berita').select('id,judul,ringkasan,gambar_url,tanggal,views,comments_count:komentar(count)').order('tanggal', { ascending: false }).limit(7),
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
            photo: tournamentPhotoById.get(String(player.id)) || player.foto_url || ranking?.photo_url || '',
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
        setAllAthletes(sorted);
        setAthletes(sorted.slice(0, 4));
        setNews(formattedNews);
      } catch (error) {
        console.warn('[LandingPage] homepage data sync skipped:', error);
        if (mounted) {
          setAllAthletes([]);
          setAthletes([]);
          setNews([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const spotlight = useMemo(() => {
    if (athletes.length > 0) return athletes;
    return FALLBACK_ATHLETES;
  }, [athletes]);

  return (
    <div id="landing-page" className="landing-page relative overflow-hidden bg-[#050914] text-white">
      <section className="landing-section mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[9px] font-black uppercase tracking-[.25em] text-blue-400">01 • CLUB UPDATE</div>
            <h2 className="text-3xl font-black italic uppercase tracking-[-.05em] sm:text-5xl">Latest <span className="text-blue-500">News.</span></h2>
          </div>
          <button onClick={() => goNews()} className="hidden items-center gap-2 rounded-full border border-blue-500/70 px-5 py-2.5 text-[10px] font-black uppercase tracking-[.15em] text-white transition hover:bg-blue-600 sm:flex">
            Lihat Semua <ArrowRight size={15} />
          </button>
        </div>

        {news.length > 0 ? (
          <div>
            {(() => {
              const featured = news[0];
              const others = news.slice(1, 5);
              const image = featured.gambar_url.split(/[,\s]+/)[0];
              return (
                <>
                  <button
                    onClick={() => goNews(featured.id)}
                    className="group block w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220] text-left shadow-2xl"
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
                    <div className="bg-gradient-to-r from-[#0b3b91] via-[#1557d6] to-[#2563eb] px-5 py-5 sm:px-7 sm:py-6">
                      <div className="mb-2 inline-flex rounded-full bg-blue-600 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-white">
                        Berita Terbaru
                      </div>
                      <h3 className="text-xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">{featured.judul}</h3>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/85 sm:text-sm">{featured.ringkasan}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold uppercase tracking-wider text-white/80 sm:text-[9px]">
                          <span>{featured.tanggal ? new Date(featured.tanggal).toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) : 'Terbaru'}</span>
                          <span className="inline-flex items-center gap-1"><Eye size={12}/> {featured.views}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle size={12}/> {featured.comments_count}</span>
                        </div>
                        <span className="hidden items-center gap-2 text-sm font-black text-white sm:inline-flex">Baca Selengkapnya <ArrowRight size={16}/></span>
                      </div>
                    </div>
                  </button>

                  <div className="mt-4 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220]">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Berita Lainnya</div>
                      <button onClick={() => goNews()} className="hidden items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-400 sm:flex">Lihat Semua <ArrowRight size={13}/></button>
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
                              <h3 className="line-clamp-2 text-sm font-black leading-tight text-white group-hover:text-blue-300 sm:text-base">{item.judul}</h3>
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
          <div className="rounded-[2rem] border border-white/10 bg-[#0b1220] px-5 py-14 text-center text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Belum ada berita terbaru.</div>
        )}
      </section>

      <section className="landing-section mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[9px] font-black uppercase tracking-[.25em] text-blue-400">02 • ATHLETE PROFILE</div>
            <h2 className="text-3xl font-black italic uppercase tracking-[-.05em] sm:text-5xl">Meet The <span className="text-blue-500">Players.</span></h2>
          </div>
          <button onClick={() => go('atlet')} className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-slate-400 hover:text-white sm:flex">
            Lihat Semua Atlet <ArrowRight size={15} />
          </button>
        </div>

        {(() => {
          const roster = allAthletes.length > 0 ? allAthletes : spotlight;
          const featured = roster[Math.min(featuredAthleteIndex, Math.max(roster.length - 1, 0))];
          const gallery = roster.slice(0, 6);
          if (!featured) {
            return (
              <div className="rounded-[2rem] border border-white/10 bg-[#0b1220] px-5 py-14 text-center text-[10px] font-black uppercase tracking-[.2em] text-slate-500">
                Data atlet sedang disinkronkan.
              </div>
            );
          }
          return (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d14] shadow-2xl">
              <button onClick={() => go('atlet')} className="group block w-full text-left">
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
                <div className="bg-[#05070b] px-5 py-5 sm:px-8 sm:py-6">
                  <div className="text-[9px] font-black uppercase tracking-[.22em] text-slate-400">Kenal Lebih Dekat</div>
                  <div className="mt-2 text-2xl font-black uppercase leading-none tracking-[-.02em] text-white sm:text-4xl">{featured.name}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[.16em] text-blue-300">
                    <span>{featured.category}</span>
                    <span className="text-slate-600">•</span>
                    <span>Seed {featured.seed}</span>
                    <span className="text-slate-600">•</span>
                    <span>{featured.points.toLocaleString()} Points</span>
                  </div>
                </div>
              </button>

              <div className="border-t border-white/10 bg-[#171717] px-4 py-5 sm:px-7">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="text-xl font-black uppercase tracking-[-.02em] text-white sm:text-2xl">Profil Atlet</div>
                  <button onClick={() => go('atlet')} className="text-sm font-medium text-slate-300 transition hover:text-blue-400 sm:text-base">
                    Lihat galeri atlet
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {gallery.map((athlete, index) => (
                    <button
                      key={athlete.id}
                      onClick={() => setFeaturedAthleteIndex(index)}
                      className={`group relative aspect-[.82] overflow-hidden rounded-xl border transition sm:rounded-2xl ${index === featuredAthleteIndex ? 'border-blue-500 ring-2 ring-blue-500/25' : 'border-white/10 hover:border-blue-400/60'}`}
                    >
                      {athlete.photo ? (
                        <LazyImage src={athlete.photo} alt={athlete.name} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" containerClassName="h-full w-full" width={320} />
                      ) : (
                        <div className="grid h-full place-items-center bg-[#0b1220]"><Users size={28} className="text-blue-500/30" /></div>
                      )}
                      <div className={`absolute inset-0 transition ${index === featuredAthleteIndex ? 'bg-gradient-to-t from-blue-950/75 via-transparent to-transparent' : 'bg-gradient-to-t from-black/75 via-black/5 to-transparent'}`} />
                      <div className={`absolute inset-x-2 bottom-2 line-clamp-1 text-left text-[10px] font-black uppercase ${index === featuredAthleteIndex ? 'text-blue-200' : 'text-white'}`}>{athlete.name}</div>
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

      <section className="landing-section bg-[#08101d]">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-14 sm:px-8 lg:grid-cols-[1.2fr_.8fr] lg:px-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-400/15 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,.28),transparent_35%),linear-gradient(145deg,#0b1a30,#050914)] p-6 sm:p-9">
            <div className="absolute right-[-40px] top-[-50px] h-52 w-52 rounded-full bg-blue-600/15 blur-3xl" />
            <div className="relative">
              <div className="text-[9px] font-black uppercase tracking-[.25em] text-blue-400">02 • Club Moments</div>
              <h2 className="mt-3 max-w-xl text-3xl font-black italic uppercase leading-[.95] tracking-[-.04em] sm:text-5xl">BILIBILI 162 <span className="text-blue-500">CUP I</span></h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                Momen kompetisi, persaudaraan, dan perjuangan yang menjadi bagian dari perjalanan PB BILIBILI 162 sepanjang 2026.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-bold text-slate-300"><CalendarDays size={13} className="text-blue-400" /> 08–12 SEP 2026</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-bold text-slate-300"><Trophy size={13} className="text-amber-400" /> 2 KATEGORI</span>
              </div>
              <button onClick={() => go('prestasi')} className="mt-7 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white hover:text-blue-300">Lihat Prestasi <ArrowRight size={14} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[2rem] border border-white/10 bg-[#0b1220] p-5">
              <div className="text-4xl font-black tracking-[-.05em] text-white">2026</div>
              <div className="mt-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Season Story</div>
              <p className="mt-5 text-xs leading-5 text-slate-400">Latihan, turnamen, prestasi, dan kebersamaan dalam satu perjalanan.</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#0b1220] p-5">
              <div className="text-4xl font-black tracking-[-.05em] text-blue-400">LIVE</div>
              <div className="mt-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Club Data</div>
              <p className="mt-5 text-xs leading-5 text-slate-400">Profil atlet dan poin terhubung dengan data klub.</p>
            </div>
            <div className="col-span-2 rounded-[2rem] border border-white/10 bg-[#0b1220] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-400"><Zap size={18} /></div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.2em] text-blue-300">Club Energy</div>
                  <div className="mt-1 text-lg font-black uppercase">Train. Compete. Grow.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[9px] font-black uppercase tracking-[.25em] text-amber-400">03 • Top Ranking</div>
            <h2 className="text-3xl font-black italic uppercase tracking-[-.04em] sm:text-5xl">Chase The <span className="text-amber-400">Points.</span></h2>
          </div>
          <button onClick={() => go('peringkat')} className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-slate-400 hover:text-white sm:flex">Ranking Lengkap <ChevronRight size={15} /></button>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a101c]">
          {loading ? (
            <div className="grid place-items-center px-6 py-16 text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Sinkronisasi ranking...</div>
          ) : (
            spotlight.map((athlete, index) => (
              <button key={athlete.id} onClick={() => go('peringkat')} className="group flex w-full items-center gap-3 border-b border-white/8 px-4 py-4 text-left transition hover:bg-white/[.035] sm:px-6">
                <div className={`w-9 shrink-0 text-center text-sm font-black ${index === 0 ? 'text-amber-400' : 'text-slate-500'}`}>0{index + 1}</div>
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                  {athlete.photo ? <LazyImage src={athlete.photo} alt="" className="h-full w-full object-cover object-top" containerClassName="h-full w-full" width={120} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-black uppercase text-white sm:text-sm">{athlete.name}</div>
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">{athlete.category} • Seed {athlete.seed}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-black text-blue-300 sm:text-base">{athlete.points.toLocaleString()}</div>
                  <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">POINTS</div>
                </div>
              </button>
            ))
          )}
        </div>
        <button onClick={() => go('peringkat')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-300 sm:hidden">Buka Ranking Lengkap <ArrowRight size={14} /></button>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-blue-400/20 bg-[radial-gradient(circle_at_75%_20%,rgba(37,99,235,.28),transparent_34%),linear-gradient(120deg,#0b1c35,#07101f)] px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400"><Trophy size={21} /></div>
            <div className="text-[9px] font-black uppercase tracking-[.3em] text-blue-300">04 • Join The Club</div>
            <h2 className="mt-3 text-4xl font-black italic uppercase leading-[.92] tracking-[-.05em] sm:text-6xl">Ready To <span className="text-blue-500">Play?</span></h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-300">Jadilah bagian dari perjalanan PB BILIBILI 162. Latihan bersama, bertanding dengan sportivitas, dan tumbuh sebagai keluarga.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button onClick={() => go('register')} className="inline-flex min-h-12 items-center gap-3 rounded-2xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-[.16em] shadow-lg shadow-blue-600/20">Daftar Atlet <ArrowRight size={15} /></button>
              <button onClick={() => go('jadwal')} className="inline-flex min-h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/5 px-6 text-[10px] font-black uppercase tracking-[.16em]">Jadwal Latihan</button>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        #landing-page { --landing-blue:#2563eb; }
        #landing-page .landing-section { scroll-margin-top:80px; }
        @media (prefers-reduced-motion: reduce) {
          #landing-page *, #landing-page *::before, #landing-page *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
        }
        @media (max-width: 640px) {
          #landing-page .landing-hero { min-height:calc(100svh - 58px); }
          #landing-page .landing-hero > div:nth-child(2) { min-height:calc(100svh - 58px); }
        }
      `}</style>
    </div>
  );
}
