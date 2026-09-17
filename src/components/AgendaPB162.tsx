import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Radio, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

type AgendaItem = {
  id: string; title: string; description?: string | null; event_date: string;
  start_time?: string | null; end_time?: string | null; location?: string | null;
  category?: string | null; status?: string | null; is_published?: boolean;
  image_url?: string | null;
};

const dateLabel = (value: string) => new Intl.DateTimeFormat('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(new Date(`${value}T00:00:00`));
const timeLabel = (a: AgendaItem) => a.start_time ? `${a.start_time.slice(0,5)}${a.end_time ? `–${a.end_time.slice(0,5)}` : ''} WITA` : 'Waktu menyesuaikan';

export default function AgendaPB162({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('agenda_pb162').select('*').eq('is_published', true).order('event_date', { ascending: true }).order('start_time', { ascending: true });
    if (!error) setItems((data || []) as AgendaItem[]);
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
          const next = current.some(x => x.id === row.id) ? current.map(x => x.id === row.id ? row : x) : [...current, row];
          return next.sort((a,b) => `${a.event_date} ${a.start_time||''}`.localeCompare(`${b.event_date} ${b.start_time||''}`));
        });
      }).subscribe(status => setOnline(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const visible = useMemo(() => compact ? items.slice(0, 3) : items, [items, compact]);

  return <section id="agenda-pb162" className="w-full bg-[#070d1a] py-10 sm:py-14 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300"><CalendarDays size={13}/> Agenda PB Bilibili 162</div>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">Agenda <span className="text-blue-500">Kegiatan</span></h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Jadwal kegiatan terbaru klub yang tersinkron langsung dari database.</p>
        </div>
        <div className={`inline-flex items-center gap-2 self-start sm:self-auto rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${online ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}><Radio size={12} className={online ? 'animate-pulse' : ''}/>{online ? 'Realtime aktif' : 'Menghubungkan...'}</div>
      </div>

      {loading ? <div className="rounded-2xl border border-white/10 bg-[#0b1224] p-8 text-center text-sm text-slate-400"><RefreshCw size={18} className="mx-auto mb-2 animate-spin"/>Memuat agenda...</div> : !visible.length ? <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b1224] p-8 text-center text-sm text-slate-500">Belum ada agenda yang dipublikasikan.</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">{visible.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] shadow-xl transition hover:border-blue-500/40 hover:-translate-y-0.5">
        {item.image_url ? <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900"><img src={item.image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1224] to-transparent" /></div> : <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-blue-950 via-[#0b1224] to-slate-950"><CalendarDays size={42} className="text-blue-500/40" /></div>}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-blue-300">{item.category || 'Kegiatan Klub'}</span><span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[8px] font-bold text-emerald-300">{item.status || 'Terjadwal'}</span></div>
          <h3 className="mt-4 text-lg font-black uppercase italic text-white leading-tight">{item.title}</h3>
          <p className="mt-2 text-xs font-semibold text-blue-300">{dateLabel(item.event_date)}</p>
          <div className="mt-4 space-y-2 text-xs text-slate-300"><div className="flex gap-2"><Clock3 size={14} className="shrink-0 text-amber-400"/><span>{timeLabel(item)}</span></div>{item.location && <div className="flex gap-2"><MapPin size={14} className="shrink-0 text-rose-400"/><span>{item.location}</span></div>}</div>
          {item.description && <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-400">{item.description}</p>}
        </div>
      </article>)}</div>}
      {compact && items.length > 3 && <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Buka menu Agenda untuk melihat seluruh kegiatan</p>}
    </div>
  </section>;
}
