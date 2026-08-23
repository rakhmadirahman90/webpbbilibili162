import React, { useEffect, useState } from 'react';
import { PackageOpen, Box } from 'lucide-react';
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
  updated_at?: string;
}

function InventoryImage({ item }: { item: Item }) {
  const [failed, setFailed] = useState(false);
  const src = (item.gambar || '').trim();
  const isDataImage = src.startsWith('data:image/');

  if (!src || failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/5 to-orange-500/10 text-amber-500/40">
        <Box size={36} className="stroke-[1.5]" />
        <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-500">Tidak ada foto</span>
      </div>
    );
  }

  // Supabase currently stores several inventory images as SVG data URIs.
  // Render those directly so they are never sent through an external optimizer/proxy.
  if (isDataImage) {
    return (
      <img
        src={src}
        alt={item.nama}
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    );
  }

  return (
    <LazyImage
      src={src}
      alt={item.nama}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      containerClassName="w-full h-full"
      width={800}
      onError={() => setFailed(true)}
    />
  );
}

export default function PublicInventaris() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventaris')
        .select('id,nama,kategori,jumlah_total,jumlah_baik,jumlah_rusak,keterangan,gambar,updated_at')
        .order('kategori', { ascending: true })
        .order('nama', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as Item[];
      setItems(rows);
      localStorage.setItem('inventaris_local_v4', JSON.stringify(rows));
    } catch (error) {
      console.error('Gagal memuat inventaris publik:', error);
      try {
        const cached = JSON.parse(localStorage.getItem('inventaris_local_v4') || localStorage.getItem('inventaris_local_v3') || '[]');
        setItems(Array.isArray(cached) ? cached : []);
      } catch {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
    const channel = supabase
      .channel('inventaris-public-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventaris' }, () => void fetchItems())
      .subscribe();
    const refresh = () => void fetchItems();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
    <div className="flex flex-col flex-grow min-h-0 w-full py-4 sm:py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-5 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <PackageOpen className="text-amber-500" size={24} />Inventaris Klub
          </h1>
          <p className="text-slate-400 text-xs mt-1">Data inventaris resmi klub • tersinkronisasi realtime</p>
        </div>
        <span className="relative z-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Realtime
        </span>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar pb-24">
        {loading ? (
          <div className="text-center text-slate-500 py-20">Memuat inventaris…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Box size={48} className="text-slate-600 mb-2" />
            <p className="text-sm font-bold uppercase tracking-wider">Belum Ada Data Inventaris</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => (
              <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl overflow-hidden relative group transition-all duration-300 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col h-full">
                <div className="relative h-52 sm:h-56 bg-black/40 overflow-hidden border-b border-white/5 shrink-0">
                  <InventoryImage item={item} />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{item.kategori}</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-white leading-tight text-base group-hover:text-amber-400 transition-colors mb-3">{item.nama}</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-black/40 rounded-xl p-1.5 text-center border border-white/5"><p className="text-[9px] text-slate-500 mb-0.5 uppercase font-bold tracking-wider">Total</p><p className="font-black text-white text-sm">{item.jumlah_total}</p></div>
                    <div className="bg-emerald-500/10 rounded-xl p-1.5 text-center border border-emerald-500/20"><p className="text-[9px] text-emerald-500 mb-0.5 uppercase font-bold tracking-wider">Baik</p><p className="font-black text-emerald-400 text-sm">{item.jumlah_baik}</p></div>
                    <div className="bg-red-500/10 rounded-xl p-1.5 text-center border border-red-500/20"><p className="text-[9px] text-red-500 mb-0.5 uppercase font-bold tracking-wider">Rusak</p><p className="font-black text-red-400 text-sm">{item.jumlah_rusak}</p></div>
                  </div>
                  {item.keterangan && <p className="text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-lg mt-auto">{item.keterangan}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
