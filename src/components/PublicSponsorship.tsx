import React, { useCallback, useEffect, useState } from 'react';
import { Handshake, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting } from '../utils/siteSettingsHelper';

type Sponsor = { id: string; name: string; logo_url: string; website_url?: string; tier?: string; description?: string; order_index?: number; active?: boolean };

const normalize = (raw: any): Sponsor[] => {
  if (!raw) return [];
  let value = raw;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return []; } }
  const list = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
  return list.map((item: any, index: number) => ({
    id: String(item?.id || `sponsor_${index}`), name: String(item?.name || item?.nama || '').trim(), logo_url: String(item?.logo_url || item?.logo || '').trim(),
    website_url: String(item?.website_url || item?.website || '').trim(), tier: String(item?.tier || item?.kategori || 'Official Sponsor').trim(),
    description: String(item?.description || item?.deskripsi || '').trim(), order_index: Number(item?.order_index ?? index), active: item?.active !== false,
  })).filter((item: Sponsor) => item.name && item.active !== false).sort((a: Sponsor, b: Sponsor) => Number(a.order_index || 0) - Number(b.order_index || 0));
};

export default function PublicSponsorship() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { setSponsors(normalize(await getSiteSetting('sponsorship_list'))); }
    catch { try { setSponsors(normalize(localStorage.getItem('site_setting_sponsorship_list'))); } catch {} }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => {
    void load();
    const onSetting = (event: any) => { if (event.detail?.key === 'sponsorship_list') setSponsors(normalize(event.detail?.value)); };
    window.addEventListener('site_setting_updated', onSetting);
    const channel = supabase.channel(`public-sponsorship-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.sponsorship_list' }, (payload: any) => {
      if (payload?.new?.value !== undefined) setSponsors(normalize(payload.new.value)); else void load();
    }).subscribe();
    return () => { window.removeEventListener('site_setting_updated', onSetting); supabase.removeChannel(channel); };
  }, [load]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] w-full overflow-x-hidden bg-[#050b17] px-3 py-5 text-white sm:px-5 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl flex-col justify-center">
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-[#101b33] via-[#0a1427] to-[#050914] px-5 py-7 shadow-2xl sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" /><div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-amber-200"><Handshake size={14}/> Partnership • Bilibili 162 Cup I</div>
            <h1 className="text-2xl font-black uppercase tracking-tight sm:text-4xl">Daftar Sponsorship</h1>
            <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-5 text-slate-400 sm:text-sm">Terima kasih kepada para sponsor dan mitra yang mendukung terselenggaranya kompetisi dengan semangat sportivitas, prestasi, dan kebersamaan.</p>
          </div>
          {loading ? <div className="flex min-h-64 items-center justify-center text-xs text-slate-500"><RefreshCw size={17} className="mr-2 animate-spin"/> Memuat daftar sponsor...</div> : sponsors.length ? (
            <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
              {sponsors.map((sponsor) => { const card = <article className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] p-4 text-center shadow-lg backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-amber-300/30 hover:bg-white/[.06] sm:min-h-[205px] sm:p-5"><div className="flex h-24 w-full items-center justify-center rounded-xl border border-white/5 bg-white/[.97] p-3 shadow-inner sm:h-28">{sponsor.logo_url ? <img src={sponsor.logo_url} alt={`Logo ${sponsor.name}`} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain"/> : <div className="flex h-full items-center gap-2 text-slate-400"><Sparkles size={18}/><span className="text-xs font-bold">Sponsor</span></div>}</div><span className="mt-3 text-[8px] font-black uppercase tracking-[.18em] text-amber-300/80">{sponsor.tier || 'Official Sponsor'}</span><h2 className="mt-1 line-clamp-2 text-xs font-black uppercase leading-4 text-white sm:text-sm">{sponsor.name}</h2>{sponsor.description && <p className="mt-1 line-clamp-2 text-[9px] leading-3 text-slate-500">{sponsor.description}</p>}</article>; return sponsor.website_url ? <a key={sponsor.id} href={sponsor.website_url} target="_blank" rel="noreferrer" aria-label={`Buka website ${sponsor.name}`}>{card}</a> : <div key={sponsor.id}>{card}</div>; })}
            </div>
          ) : <div className="relative z-10 mx-auto mt-7 flex min-h-52 max-w-xl flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 text-center"><Handshake size={34} className="text-slate-600"/><h2 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-400">Sponsor Segera Hadir</h2><p className="mt-1 text-[10px] leading-4 text-slate-600">Daftar sponsor yang telah dikonfirmasi akan ditampilkan di halaman ini.</p></div>}
          <div className="relative z-10 mt-7 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row"><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-slate-600">BILIBILI 162 CUP I • 2026</p><button type="button" onClick={() => void load()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:border-amber-300/30 hover:text-amber-200 disabled:opacity-50"><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''}/> Perbarui</button></div>
        </section>
      </div>
    </main>
  );
}
