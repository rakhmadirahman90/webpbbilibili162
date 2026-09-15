import React, { useCallback, useEffect, useState } from 'react';
import { CalendarOff, RefreshCw, Trophy, Home } from 'lucide-react';
import { supabase } from '../supabase';

type ActiveTournament = {
  id: number;
  name: string;
  event_start?: string | null;
  event_end?: string | null;
  venue?: string | null;
  status?: string | null;
  is_active: boolean;
};

const date = (v?: string | null) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

export default function PublicTournamentGate({ children }: { children: React.ReactNode }) {
  const [tournament, setTournament] = useState<ActiveTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const goHome = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent('pb-navigate-home'));
    } catch { }
    window.location.assign('/');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('seeded_tournaments')
        .select('id,name,event_start,event_end,venue,status,is_active')
        .eq('is_active', true)
        .order('event_start', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (e) throw e;
      setTournament((data || null) as ActiveTournament | null);
    } catch (e: any) {
      setTournament(null);
      setError(e?.message || 'Status event belum dapat diperiksa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`public-active-tournament-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seeded_tournaments' }, () => void load())
      .subscribe();
    const onChanged = () => void load();
    window.addEventListener('app_data_changed', onChanged);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('app_data_changed', onChanged);
    };
  }, [load]);

  if (loading) return <main className="min-h-[60vh] flex items-center justify-center bg-[#050b17] px-4 text-slate-300"><div className="flex items-center gap-2 text-xs font-bold"><RefreshCw size={15} className="animate-spin text-blue-400"/> Memeriksa event turnamen...</div></main>;

  if (!tournament) return (
    <main className="min-h-[65vh] w-full bg-[#050b17] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex w-full items-center justify-start">
          <button
            type="button"
            onClick={goHome}
            aria-label="Kembali ke Beranda"
            title="Beranda"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-slate-900/95 text-blue-300 shadow-md backdrop-blur-md transition-all hover:border-blue-300 hover:bg-blue-500/15 hover:text-white active:scale-95 sm:h-11 sm:w-11"
          >
            <Home size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="w-full rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#0b1730] via-[#0a1429] to-[#050914] p-7 text-center shadow-2xl sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300"><CalendarOff size={30}/></div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300"><Trophy size={14}/> Informasi Turnamen</div>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight sm:text-4xl">Belum Ada Event yang Berlangsung</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">Saat ini belum ada event turnamen yang sedang berlangsung. Data turnamen akan ditampilkan kembali setelah admin mengaktifkan event berikutnya.</p>
          {error && <p className="mt-4 text-[10px] text-slate-600">Status event sementara tidak tersedia.</p>}
        </div>
      </div>
    </main>
  );

  return <>{children}</>;
}
