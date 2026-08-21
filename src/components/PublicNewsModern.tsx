import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, Heart, Search, Sparkles, Trophy, X, ArrowUpRight } from 'lucide-react';
import { supabase } from '../supabase';

interface Berita {
  id: string;
  judul: string;
  ringkasan?: string;
  konten?: string;
  kategori?: string;
  gambar_url?: string;
  tanggal?: string;
  penulis?: string;
  views?: number;
  likes?: number;
}

interface Props {
  initialCategory?: string;
}

const formatDate = (value?: string) => {
  if (!value) return 'Berita PB Bilibili 162';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const firstImage = (value?: string) => {
  if (!value) return '';
  return value.split(/[\s,]+/).map(v => v.trim()).find(Boolean) || '';
};

export default function PublicNewsModern({ initialCategory = 'ALL ARTICLES' }: Props) {
  const forcedCategory = initialCategory.toUpperCase();
  const [news, setNews] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(forcedCategory);
  const [selected, setSelected] = useState<Berita | null>(null);

  useEffect(() => {
    setCategory(forcedCategory);
  }, [forcedCategory]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('berita')
        .select('*')
        .order('tanggal', { ascending: false });
      if (!active) return;
      if (!error && data) {
        setNews(data.map((item: any) => ({
          ...item,
          views: Number(item.views) || 0,
          likes: Number(item.likes) || 0,
        })));
      } else {
        setNews([]);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`public-news-modern-${forcedCategory}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'berita' }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [forcedCategory]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(news.map(item => item.kategori?.trim()).filter(Boolean))) as string[];
    return ['ALL ARTICLES', ...values.map(v => v.toUpperCase()).filter(v => v !== 'ALL ARTICLES')];
  }, [news]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter(item => {
      const itemCategory = item.kategori?.toLowerCase() || '';
      const categoryMatch = category === 'ALL ARTICLES' || itemCategory.includes(category.toLowerCase());
      const searchMatch = !q || [item.judul, item.ringkasan, item.konten, item.kategori]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    });
  }, [news, category, search]);

  const isPrestasi = forcedCategory === 'PRESTASI';

  return (
    <main
      id={isPrestasi ? 'prestasi-news-section' : 'berita-section'}
      className="public-news-modern w-full shrink-0 min-h-fit overflow-visible bg-slate-50 text-slate-900"
    >
      <div className="relative overflow-hidden bg-[#07101f]">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
              {isPrestasi ? <Trophy size={13} /> : <Sparkles size={13} />}
              {isPrestasi ? 'Berita Prestasi' : 'Pusat Berita'}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              {isPrestasi ? <>Prestasi <span className="text-blue-300">PB Bilibili 162</span></> : <>Berita & <span className="text-blue-300">Informasi</span></>}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {isPrestasi
                ? 'Kumpulan berita dan dokumentasi pencapaian, kemenangan, turnamen, serta perjalanan prestasi keluarga PB Bilibili 162.'
                : 'Ikuti kabar terbaru kegiatan, pertandingan, prestasi, agenda, dan aktivitas keluarga besar PB Bilibili 162.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-7 lg:px-8">
        <section className="sticky top-2 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/50 backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isPrestasi ? 'Cari berita prestasi...' : 'Cari berita...'}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.slice(0, 8).map(cat => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 rounded-xl px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wide transition ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {cat === 'ALL ARTICLES' ? 'Semua' : cat}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
            <span>{filtered.length} berita ditemukan</span>
            {category !== 'ALL ARTICLES' && <button onClick={() => setCategory('ALL ARTICLES')} className="text-blue-600">Reset filter</button>}
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-[330px] animate-pulse rounded-2xl bg-white shadow-sm" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search size={21} /></div>
            <h2 className="text-base font-black text-slate-800">Belum ada berita</h2>
            <p className="mt-1 text-sm text-slate-500">Belum ditemukan berita untuk filter yang dipilih.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, index) => (
              <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
                <button type="button" onClick={() => setSelected(item)} className="block w-full text-left">
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
                    {firstImage(item.gambar_url) ? (
                      <img src={firstImage(item.gambar_url)} alt={item.judul} loading={index < 3 ? 'eager' : 'lazy'} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 text-white"><Sparkles size={30} /></div>
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                      <span className="rounded-lg bg-white/95 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-700 shadow-sm">{item.kategori || 'BERITA'}</span>
                      <span className="rounded-full bg-black/45 p-2 text-white backdrop-blur-sm"><ArrowUpRight size={15} /></span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <CalendarDays size={13} /> {formatDate(item.tanggal)}
                    </div>
                    <h2 className="line-clamp-2 text-[17px] font-black leading-6 text-slate-900 transition group-hover:text-blue-700">{item.judul}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-500">{item.ringkasan || item.konten?.replace(/<[^>]*>/g, '').slice(0, 150) || 'Baca berita selengkapnya dari PB Bilibili 162.'}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                      <span>{item.penulis || 'Humas PB Bilibili 162'}</span>
                      <span className="flex items-center gap-3"><span className="flex items-center gap-1"><Eye size={12} /> {item.views || 0}</span><span className="flex items-center gap-1"><Heart size={12} /> {item.likes || 0}</span></span>
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setSelected(null)}>
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">{selected.kategori || 'BERITA'}</span>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><X size={18} /></button>
            </div>
            {firstImage(selected.gambar_url) && <img src={firstImage(selected.gambar_url)} alt={selected.judul} className="aspect-[16/9] w-full object-cover" />}
            <div className="p-5 sm:p-7">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400"><CalendarDays size={14} /> {formatDate(selected.tanggal)}</div>
              <h2 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">{selected.judul}</h2>
              <div className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">{(selected.konten || selected.ringkasan || '').replace(/<[^>]*>/g, '')}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
