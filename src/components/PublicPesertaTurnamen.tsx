import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, RefreshCw, ShieldCheck, X, ChevronLeft, ChevronRight, Home, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabase';

type Registration = {
  id: string | number;
  created_at?: string;
  kode_pendaftaran?: string | null;
  kategori?: string | null;
  nama_pemain_1?: string | null;
  nama_pemain_2?: string | null;
  asal_pb?: string | null;
  status_pendaftaran?: string | null;
  foto_pemain_1_url?: string | null;
  foto_pemain_2_url?: string | null;
  [key: string]: any;
};

type PublicPair = Registration & { pesertaNo: string; kodeKategoriPB: string; foto1: string; foto2: string };

const clean = (v: unknown) => String(v ?? '').trim();
const normalized = (v: unknown) => clean(v).toLowerCase();
const accepted = (v: unknown) => ['diterima', 'accepted', 'approved', 'terverifikasi', 'lolos'].includes(normalized(v));
const categoryCode = (category: string) => {
  const c = normalized(category);
  if (c.includes('cc') && c.includes('parepare')) return 'CC';
  if (c.includes('ajatappareng') || c.includes('ad/bc') || c.includes('ad/ bc')) return 'AD/BC-/C+C';
  return clean(category) || 'UMUM';
};

function directUrl(value: unknown) {
  const v = clean(value);
  return /^https?:\/\//i.test(v) ? v : '';
}

export default function PublicPesertaTurnamen() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, { foto1: string; foto2: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (initial = false) => {
    if (requestRef.current) return requestRef.current;
    const task = (async () => {
      if (initial) setLoading(true);
      setRefreshing(true);
      setError('');
      try {
        const all: Registration[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: e } = await supabase
            .from('pendaftaran_turnamen')
            .select('*')
            .order('created_at', { ascending: true })
            .range(from, from + 999);
          if (e) throw e;
          const batch = (data || []) as Registration[];
          all.push(...batch);
          if (batch.length < 1000) break;
        }
        if (!mountedRef.current) return;
        setRows(all.filter(r => accepted(r.status_pendaftaran)));
      } catch (e: any) {
        console.error('[public-peserta-turnamen] load failed', e);
        if (mountedRef.current) setError(e?.message || 'Daftar peserta belum dapat dimuat.');
      } finally {
        if (mountedRef.current) { setLoading(false); setRefreshing(false); }
      }
    })();
    requestRef.current = task;
    try { await task; } finally { if (requestRef.current === task) requestRef.current = null; }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load(true);
    const onChange = () => void load(false);
    window.addEventListener('app_data_changed', onChange);
    window.addEventListener('table_updated_pendaftaran_turnamen', onChange);
    const channel = supabase.channel(`public-peserta-turnamen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, onChange)
      .subscribe();
    return () => {
      mountedRef.current = false;
      window.removeEventListener('app_data_changed', onChange);
      window.removeEventListener('table_updated_pendaftaran_turnamen', onChange);
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const resolvePhotos = async () => {
      const next: Record<string, { foto1: string; foto2: string }> = {};
      for (const row of rows) {
        const result = { foto1: directUrl(row.foto_pemain_1_url), foto2: directUrl(row.foto_pemain_2_url) };
        const entries: Array<[keyof typeof result, keyof Registration]> = [['foto1', 'foto_pemain_1_url'], ['foto2', 'foto_pemain_2_url']];
        for (const [key, field] of entries) {
          if (result[key]) continue;
          const raw = clean(row[field]);
          if (!raw) continue;
          try {
            const { data, error: e } = await supabase.storage.from('turnamen-dokumen').createSignedUrl(raw, 60 * 60);
            if (!e && data?.signedUrl) result[key] = data.signedUrl;
          } catch {}
        }
        next[String(row.id)] = result;
      }
      if (!cancelled) setPhotoUrls(next);
    };
    void resolvePhotos();
    return () => { cancelled = true; };
  }, [rows]);

  const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => {
    const q = normalized(query);
    return rows.filter(r => {
      const hay = [r.nama_pemain_1, r.nama_pemain_2, r.asal_pb, r.kategori, r.kode_pendaftaran].map(clean).join(' ').toLowerCase();
      return (!q || hay.includes(q)) && (category === 'Semua' || clean(r.kategori) === category);
    });
  }, [rows, query, category]);

  useEffect(() => setPage(1), [query, category, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const publicPairs: PublicPair[] = visible.map((row, index) => {
    const globalIndex = (safePage - 1) * pageSize + index;
    const photo = photoUrls[String(row.id)] || { foto1: '', foto2: '' };
    const rawNo = row.no_peserta ?? row.nomor_peserta ?? row.noPeserta ?? row.nomorPeserta;
    const pesertaNo = clean(rawNo) || `P${String(globalIndex + 1).padStart(3, '0')}`;
    const rawCode = row.kode_kategori_pb ?? row.kodeKategoriPB ?? row.kode_kategori_pb_peserta ?? row.kode_kategori;
    const pb = clean(row.asal_pb) || 'PB/CLUB';
    const kodeKategoriPB = clean(rawCode) || `${categoryCode(clean(row.kategori))} / ${pb}`;
    return { ...row, pesertaNo, kodeKategoriPB, foto1: photo.foto1, foto2: photo.foto2 };
  });

  const goHome = () => window.location.assign('/');
  const titleFor = (row: PublicPair) => `${clean(row.nama_pemain_1) || 'Pemain 1'} & ${clean(row.nama_pemain_2) || 'Pemain 2'}`;

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#050b17] px-2.5 py-4 text-white sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={goHome} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:border-blue-400/40 hover:text-blue-200"><Home size={15} className="text-blue-300"/> Beranda</button>
          <span className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-slate-600 sm:block">Bilibili 162 Cup I • 2026</span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#0b1730] via-[#0a1429] to-[#050914] p-4 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300"><ShieldCheck size={13}/> Resmi Diterima Admin</div>
              <h1 className="text-xl font-black uppercase tracking-tight sm:text-3xl">Daftar Peserta Turnamen</h1>
              <p className="mt-1.5 max-w-3xl text-[11px] leading-4 text-slate-400 sm:text-xs">Daftar pasangan yang telah berhasil diterima oleh admin. Data diperbarui otomatis dari database pendaftaran turnamen.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] font-bold text-slate-300"><Users size={14} className="text-blue-300"/> {rows.length.toLocaleString('id-ID')} pasangan diterima</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-2.5 shadow-xl sm:p-3">
          <div className="flex min-w-0 gap-2">
            <label className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama pemain, PB/klub, kategori..." className="min-h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-9 py-2 text-[11px] text-white outline-none focus:border-blue-500 sm:text-xs"/></label>
            <button type="button" onClick={() => void load(false)} disabled={refreshing} title="Muat ulang" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-slate-300 hover:border-blue-500 hover:text-blue-300 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/></button>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><select value={category} onChange={e => setCategory(e.target.value)} className="min-h-9 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-[11px] font-semibold text-slate-200 outline-none focus:border-blue-500 sm:max-w-sm"><option value="Semua">Semua Kategori</option>{categories.filter(x => x !== 'Semua').map(v => <option key={v} value={v}>{v}</option>)}</select><label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">Tampil <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></label></div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-2.5 shadow-xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3"><div><h2 className="text-sm font-black uppercase tracking-wide sm:text-base">Peserta yang Telah Diterima</h2><p className="mt-1 text-[10px] text-slate-500">{filtered.length ? `Menampilkan ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} dari ${filtered.length} pasangan.` : 'Tidak ada data yang sesuai.'}</p></div></div>
          {loading && rows.length === 0 ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-400">Memuat peserta diterima...</div> : error && rows.length === 0 ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-300">{error}</div> : filtered.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-slate-500"><Users size={30}/><span>Belum ada peserta yang diterima admin.</span></div> : <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{publicPairs.map(row => <article key={String(row.id)} className="overflow-hidden rounded-xl border border-white/10 bg-[#07101f] shadow-md transition hover:-translate-y-0.5 hover:border-blue-400/30">
            <div className="flex items-start justify-between gap-2 border-b border-white/10 px-2.5 py-2"><div className="min-w-0"><p className="text-[7px] font-black uppercase tracking-[.14em] text-blue-300">No Peserta</p><p className="mt-0.5 font-mono text-sm font-black tracking-wider text-white sm:text-base">{row.pesertaNo}</p></div><div className="min-w-0 max-w-[65%] text-right"><p className="text-[7px] font-black uppercase tracking-[.12em] text-slate-500">KodeKategoriPB</p><p className="mt-0.5 break-words text-[8px] font-black leading-3 text-amber-300">{row.kodeKategoriPB}</p></div></div>
            <div className="grid grid-cols-2 gap-1.5 p-2">{[[row.foto1, clean(row.nama_pemain_1) || 'Pemain 1'], [row.foto2, clean(row.nama_pemain_2) || 'Pemain 2']].map(([url, name], i) => <button type="button" key={i} onClick={() => url && setLightbox({ url, name })} disabled={!url} className="group relative overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-left disabled:cursor-default"><div className="aspect-[4/3] w-full">{url ? <img src={url} alt={`Foto ${name}`} loading="lazy" className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"/> : <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center text-[7px] font-bold text-slate-600"><ImageIcon size={19}/><span>Foto belum tersedia</span></div>}</div>{url && <span className="absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"><ZoomIn size={11}/></span>}</button>)}</div>
            <div className="px-2.5 pb-2.5"><h3 className="line-clamp-2 text-[10px] font-black leading-3.5 text-white sm:text-[11px]">{titleFor(row)}</h3><p className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-3 text-slate-500">{clean(row.kategori) || '-'} • {clean(row.asal_pb) || 'PB/Club'}</p></div>
          </article>)}</div>}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3"><p className="text-[9px] font-bold text-slate-500">Halaman <span className="text-slate-200">{safePage}</span> / <span className="text-slate-200">{totalPages}</span></p><div className="flex items-center gap-1"><button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-slate-400 disabled:opacity-30"><ChevronLeft size={14}/></button><button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-slate-400 disabled:opacity-30"><ChevronRight size={14}/></button></div></div>
        </section>
      </div>

      {lightbox && <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={e => { if (e.currentTarget === e.target) setLightbox(null); }}><div className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl sm:p-4"><button type="button" onClick={() => setLightbox(null)} aria-label="Tutup foto" className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><X size={16}/></button><img src={lightbox.url} alt={`Foto ${lightbox.name}`} className="max-h-[80dvh] w-auto max-w-full rounded-xl object-contain"/><p className="text-xs font-black text-white">{lightbox.name}</p></div></div>}
    </main>
  );
}
