import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Medal, Trophy, Users, Zap } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  const go = useCallback((path: string) => {
    if (onNavigate) onNavigate(path);
    else window.location.href = path === 'home' ? '/' : `/${path}`;
  }, [onNavigate]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [playersRes, rankingsRes, statsRes] = await Promise.all([
          supabase.from('pendaftaran').select('id,nama,foto_url,kategori,kategori_atlet').order('nama', { ascending: true }),
          supabase.from('rankings').select('pendaftaran_id,player_name,total_points,photo_url').order('total_points', { ascending: false }),
          supabase.from('atlet_stats').select('pendaftaran_id,points,total_points,seed'),
        ]);

        const players = playersRes.data || [];
        const rankings = rankingsRes.data || [];
        const stats = statsRes.data || [];
        const statsMap = new Map(stats.map((row: any) => [String(row.pendaftaran_id), row]));

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
            photo: player.foto_url || ranking?.photo_url || '',
            points,
            seed: stat?.seed || 'D',
            category: String(player.kategori || player.kategori_atlet || 'SENIOR').toUpperCase().includes('MUDA') ? 'MUDA' : 'SENIOR',
            rank: 0,
          };
        }).sort((a, b) => b.points - a.points).slice(0, 4);

        if (!mounted) return;
        setAthletes(merged.map((athlete, index) => ({ ...athlete, rank: index + 1 })));
      } catch (error) {
        console.warn('[LandingPage] athlete preview skipped:', error);
        if (mounted) setAthletes([]);
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
      <section className="landing-section mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-18 lg:px-10">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[9px] font-black uppercase tracking-[.25em] text-blue-400">01 • Athlete Spotlight</div>
            <h2 className="text-3xl font-black italic uppercase tracking-[-.04em] sm:text-5xl">Meet The <span className="text-blue-500">Athletes.</span></h2>
          </div>
          <button onClick={() => go('atlet')} className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-slate-400 hover:text-white sm:flex">Semua Atlet <ChevronRight size={15} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {spotlight.map((athlete, index) => (
            <motion.button key={athlete.id} whileHover={{ y: -5 }} onClick={() => athlete.id.startsWith('fallback') ? go('atlet') : go('atlet')} className="group relative aspect-[.78] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] text-left shadow-2xl">
              {athlete.photo ? (
                <LazyImage src={athlete.photo} alt={athlete.name} className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105" containerClassName="h-full w-full" width={700} />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(37,99,235,.3),transparent_48%),#0b1220]">
                  <Trophy size={42} className="text-blue-500/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
              <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/35 text-xs font-black backdrop-blur-md">0{index + 1}</div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="mb-1 text-[8px] font-black uppercase tracking-[.18em] text-blue-300">{athlete.category}</div>
                <div className="line-clamp-2 text-sm font-black uppercase leading-tight sm:text-base">{athlete.name}</div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Seed {athlete.seed}</span>
                  <span className="text-blue-300">{athlete.points.toLocaleString()} PTS</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        <button onClick={() => go('atlet')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-300 sm:hidden">Lihat Semua Atlet <ArrowRight size={14} /></button>
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
