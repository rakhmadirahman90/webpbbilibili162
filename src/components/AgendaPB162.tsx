import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, RefreshCw, X, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

type AgendaItem = {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  category?: string | null;
  status?: string | null;
  is_published?: boolean;
  image_url?: string | null;
};

const dateLabel = (value: string) => new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
}).format(new Date(`${value}T00:00:00`));

const shortDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric'
}).format(new Date(`${value}T00:00:00`));

const timeLabel = (a: AgendaItem) => a.start_time
  ? `${a.start_time.slice(0, 5)}${a.end_time ? `–${a.end_time.slice(0, 5)}` : ''} WITA`
  : 'Waktu menyesuaikan';

const sortAgenda = (list: AgendaItem[]) => {
  const today = new Date().toISOString().slice(0, 10);
  return [...list].sort((a, b) => {
    const aFuture = a.event_date >= today;
    const bFuture = b.event_date >= today;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    const aKey = `${a.event_date} ${a.start_time || ''}`;
    const bKey = `${b.event_date} ${b.start_time || ''}`;
    return aFuture ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
  });
};

export default function AgendaPB162({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [selected, setSelected] = useState<AgendaItem | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('agenda_pb162')
      .select('*')
      .eq('is_published', true)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (!error) setItems(sortAgenda((data || []) as AgendaItem[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`agenda-public-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_pb162' }, payload => {
        const row = (payload.new || payload.old) as AgendaItem;
        setItems(current => {
          if (payload.eventType === 'DELETE') return current.filter(x => x.id !== row?.id);
          if (!row?.is_published) return current.filter(x => x.id !== row.id);
          const next = current.some(x => x.id === row.id)
            ? current.map(x => x.id === row.id ? row : x)
            : [...current, row];
          return sortAgenda(next);
        });
      })
      .subscribe(status => setOnline(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected]);

  // Landing menampilkan tepat 4 agenda: 2 kolom × 2 baris.
  // Halaman Agenda tetap menampilkan seluruh data.
  const visible = compact ? items.slice(0, 4) : items;

  return <section id="agenda-pb162" className={compact ? "agenda-landing-compact landing-section w-full bg-[#050914]" : "w-full bg-[#070d1a] px-4 py-8 sm:px-6 sm:py-10"}>
    <div className={compact ? "mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 sm:py-7 lg:px-10" : "mx-auto max-w-5xl"}>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-500/80 bg-gradient-to-r from-[#071b3d] via-[#0b2f68] to-[#071b3d] px-3 py-2.5 shadow-[0_0_22px_rgba(37,99,235,.12)] sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,.35)] sm:h-11 sm:w-11">
            <CalendarDays size={19} />
          </span>
          <h2 className="truncate text-[clamp(1.1rem,5vw,2rem)] font-extrabold uppercase leading-none tracking-[-.03em] text-white">Agenda PB Bilibili 162</h2>
        </div>
        {compact && <button type="button" onClick={() => { window.history.pushState({}, '', '/agenda'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="shrink-0 rounded-full border border-blue-300/20 bg-white/[.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-100 transition hover:bg-blue-600 hover:text-white">
          Lihat Semua <ChevronRight size={13} className="inline" />
        </button>}
      </div>

      {loading ? <div className="rounded-2xl border border-white/10 bg-[#0b1224] p-8 text-center text-sm text-slate-400"><RefreshCw size={18} className="mx-auto mb-2 animate-spin" />Memuat agenda...</div>
        : !visible.length ? <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b1224] p-8 text-center text-sm text-slate-500">Belum ada agenda yang dipublikasikan.</div>
        : <div className={compact ? "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3" : "space-y-2"}>
          {visible.map(item => <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className={compact
              ? "group flex min-h-[112px] w-full items-center gap-2.5 rounded-xl border border-white/10 bg-[#0b1224] p-2.5 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-[#0d1730] focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:min-h-[128px] sm:gap-3 sm:p-3"
              : "group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0b1224] p-2.5 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-[#0d1730] focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:gap-4 sm:p-3"}
          >
            <div className="hidden h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900 sm:block sm:h-16 sm:w-20">
              {item.image_url ? <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center"><CalendarDays size={26} className="text-blue-500/40" /></div>}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="w-12 shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-1.5 py-1.5 text-center sm:w-14">
                <div className="text-[9px] font-black uppercase tracking-wider text-blue-300">{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${item.event_date}T00:00:00`))}</div>
                <div className="text-lg font-black leading-none text-white sm:text-xl">{item.event_date.slice(8, 10)}</div>
                <div className="mt-1 text-[8px] font-bold text-slate-500">{item.event_date.slice(0, 4)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-300">{item.category || 'Kegiatan Klub'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${item.status === 'Selesai' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-300'}`}>{item.status || 'Terjadwal'}</span>
                </div>
                <h3 className="line-clamp-2 text-[11px] font-black uppercase italic leading-tight text-white sm:text-sm">{item.title}</h3>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-400 sm:text-[10px]">
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={12} className="text-amber-400" />{timeLabel(item)}</span>
                  {item.location && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={12} className="shrink-0 text-rose-400" /><span className="truncate">{item.location}</span></span>}
                </div>
              </div>
            </div>
            <ChevronRight size={20} className="shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-400" />
          </button>)}
        </div>}


    </div>

    {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
      <article className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0b1224] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="relative">
          {selected.image_url ? <img src={selected.image_url} alt={selected.title} className="aspect-video w-full object-cover" /> : <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-blue-950 via-[#0b1224] to-slate-950"><CalendarDays size={56} className="text-blue-500/40" /></div>}
          <button type="button" onClick={() => setSelected(null)} aria-label="Tutup detail agenda" className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"><X size={18} /></button>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-blue-300">{selected.category || 'Kegiatan Klub'}</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] font-bold text-emerald-300">{selected.status || 'Terjadwal'}</span>
          </div>
          <h3 className="mt-4 text-xl font-black uppercase italic leading-tight text-white sm:text-2xl">{selected.title}</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Tanggal</div><div className="text-sm font-bold text-white">{dateLabel(selected.event_date)}</div></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Waktu</div><div className="text-sm font-bold text-white">{timeLabel(selected)}</div></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-2"><div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Lokasi</div><div className="text-sm font-bold text-white">{selected.location || 'Lokasi belum ditentukan'}</div></div>
          </div>
          {selected.description && <div className="mt-5 border-t border-white/10 pt-5"><div className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Informasi Kegiatan</div><p className="text-sm leading-7 text-slate-300">{selected.description}</p></div>}
          <button type="button" onClick={() => setSelected(null)} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-500">Tutup Detail</button>
        </div>
      </article>
    </div>}
  </section>;
}
