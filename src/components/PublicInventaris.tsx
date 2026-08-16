import React, { useCallback, useEffect, useState } from 'react';
import { PackageOpen, Box, Loader2, RefreshCw, AlertCircle, ImageOff } from 'lucide-react';
import { supabase } from '../supabase';

interface Item {
  id: string;
  nama: string;
  kategori: string;
  jumlah_total: number;
  jumlah_baik: number;
  jumlah_rusak: number;
  keterangan: string;
  gambar?: string | null;
  created_at?: string;
  updated_at?: string;
}

function resolveImageUrl(value?: string | null) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return supabase.storage.from('identitas-atlet').getPublicUrl(raw).data.publicUrl;
}

export default function PublicInventaris() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('inventaris')
        .select('id,nama,kategori,jumlah_total,jumlah_baik,jumlah_rusak,keterangan,gambar,created_at,updated_at')
        .order('kategori', { ascending: true })
        .order('nama', { ascending: true });
      if (dbError) throw dbError;
      setItems((data || []) as Item[]);
    } catch (err: any) {
      console.error('[PublicInventaris] Supabase error:', err);
      setItems([]);
      setError(err?.message || 'Data inventaris tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('public-inventaris-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventaris' }, fetchItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  return (
    <main className="w-full h-full min-h-0 overflow-y-auto overscroll-contain py-5 sm:py-8 pb-32 pr-1">
      <section className="bg-[#0b1224] p-5 sm:p-7 rounded-3xl border border-white/10 relative overflow-hidden mb-6">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
              <PackageOpen className="text-amber-500" size={28} /> Inventaris Klub
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">Data langsung dari Supabase • pembaruan realtime</p>
          </div>
          <button type="button" onClick={fetchItems} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-black uppercase disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-xs flex gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[260px] rounded-3xl border border-white/5 bg-[#0b1224] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 size={40} className="animate-spin text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-widest">Memuat inventaris...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="min-h-[260px] rounded-3xl border border-white/5 bg-[#0b1224] flex flex-col items-center justify-center text-center p-8">
          <Box size={52} className="text-slate-600 mb-3 stroke-[1.5]" />
          <p className="text-white font-black uppercase tracking-wider">Belum Ada Data Inventaris</p>
          <p className="text-xs text-slate-500 mt-2 max-w-md">Tabel <b>public.inventaris</b> saat ini belum memiliki record. Tambahkan data melalui Dashboard Admin agar otomatis tampil di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => {
            const imageUrl = resolveImageUrl(item.gambar);
            return (
              <article key={item.id} className="bg-[#0b1224] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg">
                <div className="relative h-52 bg-black/40 overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.nama} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                      <ImageOff size={40} />
                      <span className="text-[10px] uppercase tracking-widest mt-2">Foto belum tersedia</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg">{item.kategori || 'Umum'}</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-white font-black text-lg leading-tight">{item.nama}</h2>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-xl bg-white/5 p-2 text-center"><div className="text-[9px] text-slate-500 uppercase">Total</div><div className="text-white font-black">{item.jumlah_total ?? 0}</div></div>
                    <div className="rounded-xl bg-emerald-500/10 p-2 text-center"><div className="text-[9px] text-emerald-400 uppercase">Baik</div><div className="text-emerald-300 font-black">{item.jumlah_baik ?? 0}</div></div>
                    <div className="rounded-xl bg-red-500/10 p-2 text-center"><div className="text-[9px] text-red-400 uppercase">Rusak</div><div className="text-red-300 font-black">{item.jumlah_rusak ?? 0}</div></div>
                  </div>
                  {item.keterangan && <p className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-slate-400 leading-relaxed">{item.keterangan}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
