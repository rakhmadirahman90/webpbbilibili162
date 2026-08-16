import React, { useCallback, useEffect, useState } from 'react';
import { PackageOpen, Box, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import LazyImage from './LazyImage';

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
  const url = String(value).trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return supabase.storage.from('identitas-atlet').getPublicUrl(url).data.publicUrl;
}

export default function PublicInventaris() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: dbError } = await supabase
      .from('inventaris')
      .select('*')
      .order('kategori', { ascending: true })
      .order('nama', { ascending: true });

    if (dbError) {
      console.error('[PublicInventaris] Supabase error:', dbError);
      setError(dbError.message);
      setItems([]);
    } else {
      setItems((data || []) as Item[]);
    }
    setLoading(false);
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
    <div className="flex flex-col flex-grow min-h-0 w-full py-4 sm:py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-5 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <PackageOpen className="text-amber-500" size={24} /> Inventaris Klub
          </h1>
          <p className="text-slate-400 text-xs mt-1">Data langsung dari database Supabase • realtime</p>
        </div>
        <button onClick={fetchItems} disabled={loading} className="relative z-10 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300 text-xs flex gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>Gagal membaca data inventaris dari Supabase: {error}</span>
        </div>
      )}

      <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Loader2 size={36} className="animate-spin text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Memuat inventaris dari Supabase...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Box size={48} className="text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-sm font-bold uppercase tracking-wider">Belum Ada Data Inventaris</p>
            <p className="text-[10px] mt-1 text-slate-600">Belum ada record pada tabel public.inventaris.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => {
              const imageUrl = resolveImageUrl(item.gambar);
              return (
                <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl overflow-hidden relative group transition-all duration-300 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col h-full">
                  <div className="relative h-44 bg-black/40 overflow-hidden border-b border-white/5 shrink-0">
                    {imageUrl ? (
                      <LazyImage src={imageUrl} alt={item.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" containerClassName="w-full h-full" width={500} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/5 to-orange-500/10 text-amber-500/40">
                        <Box size={36} className="stroke-[1.5]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-500">Tidak ada foto</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{item.kategori}</span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-white leading-tight text-base group-hover:text-amber-400 transition-colors">{item.nama}</h3>
                    <div className="grid grid-cols-3 gap-2 my-3">
                      <div className="bg-black/40 rounded-xl p-1.5 text-center border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold">Total</p><p className="font-black text-white text-sm">{item.jumlah_total}</p></div>
                      <div className="bg-emerald-500/10 rounded-xl p-1.5 text-center border border-emerald-500/20"><p className="text-[9px] text-emerald-500 uppercase font-bold">Baik</p><p className="font-black text-emerald-400 text-sm">{item.jumlah_baik}</p></div>
                      <div className="bg-red-500/10 rounded-xl p-1.5 text-center border border-red-500/20"><p className="text-[9px] text-red-500 uppercase font-bold">Rusak</p><p className="font-black text-red-400 text-sm">{item.jumlah_rusak}</p></div>
                    </div>
                    {item.keterangan && <p className="text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-lg mt-auto">{item.keterangan}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
