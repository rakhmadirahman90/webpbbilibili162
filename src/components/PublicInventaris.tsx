import React, { useState, useEffect } from 'react';
import { PackageOpen, Box } from 'lucide-react';
import { supabase } from '../supabase';

interface Item {
  id: string;
  nama: string;
  kategori: string;
  jumlah_total: number;
  jumlah_baik: number;
  jumlah_rusak: number;
  keterangan: string;
  gambar?: string;
}

export default function PublicInventaris() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  const getFallbackItems = () => {
    const local = JSON.parse(localStorage.getItem('inventaris_local_v3') || '[]');
    if (local.length === 0) {
      const defaultItems = [
        { id: 'inv_1', nama: 'Shuttlecock Yonex', kategori: 'Perlengkapan Latihan', jumlah_total: 50, jumlah_baik: 40, jumlah_rusak: 10, keterangan: 'Slop baru dan bekas latihan', gambar: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_2', nama: 'Net Bulutangkis', kategori: 'Fasilitas', jumlah_total: 4, jumlah_baik: 3, jumlah_rusak: 1, keterangan: 'Net standar turnamen', gambar: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_3', nama: 'Tiang Net Portabel', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Besi kokoh, roda masih bagus', gambar: 'https://images.unsplash.com/photo-1613918431208-675204423035?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_4', nama: 'Raket Latihan', kategori: 'Peralatan', jumlah_total: 10, jumlah_baik: 8, jumlah_rusak: 2, keterangan: 'Raket cadangan untuk anggota yang senar putus', gambar: 'https://images.unsplash.com/photo-1617083934335-e51c8db159db?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_5', nama: 'Cone / Marka Lapangan', kategori: 'Peralatan', jumlah_total: 40, jumlah_baik: 38, jumlah_rusak: 2, keterangan: 'Untuk latihan kelincahan kaki / agility', gambar: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1741e?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_6', nama: 'Tali Skipping', kategori: 'Peralatan', jumlah_total: 15, jumlah_baik: 12, jumlah_rusak: 3, keterangan: 'Untuk pemanasan dan melatih kardio', gambar: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_7', nama: 'Papan Skor Manual', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Papan skor meja portabel lipat', gambar: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_8', nama: 'Kotak P3K', kategori: 'Lainnya', jumlah_total: 1, jumlah_baik: 1, jumlah_rusak: 0, keterangan: 'Lengkap dengan spray pereda nyeri otot dan obat luka', gambar: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_9', nama: 'Keranjang Shuttlecock', kategori: 'Peralatan', jumlah_total: 3, jumlah_baik: 3, jumlah_rusak: 0, keterangan: 'Untuk menampung kock latihan drill', gambar: 'https://images.unsplash.com/photo-1521537634199-67368c740cc3?w=500&auto=format&fit=crop&q=60' },
        { id: 'inv_10', nama: 'Karpet Lapangan (Vinyl)', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Karpet lapangan standar PBSI tebal 4.5mm', gambar: 'https://images.unsplash.com/photo-1562074244-401330dba53b?w=500&auto=format&fit=crop&q=60' }
      ];
      localStorage.setItem('inventaris_local_v3', JSON.stringify(defaultItems));
      return defaultItems;
    }
    return local;
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from('inventaris').select('*').order('nama', { ascending: true });
      if (error) throw error;
      
      if (data && data.length > 0) {
        setItems(data);
        localStorage.setItem('inventaris_local_v3', JSON.stringify(data));
      } else {
        // Fallback if table exists but has 0 rows (e.g. empty or restricted by RLS)
        setItems(getFallbackItems());
      }
    } catch (error: any) {
      setItems(getFallbackItems());
    }
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 w-full py-4 sm:py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-5 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <PackageOpen className="text-amber-500" size={24} />
            Inventaris Klub
          </h1>
          <p className="text-slate-400 text-xs mt-1">Daftar peralatan dan perlengkapan latihan resmi klub</p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Box size={48} className="text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-sm font-bold uppercase tracking-wider">Belum Ada Data Inventaris</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => (
              <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl overflow-hidden relative group transition-all duration-300 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col h-full">
                {/* Image Header */}
                <div className="relative h-44 bg-black/40 overflow-hidden border-b border-white/5 shrink-0">
                  {item.gambar ? (
                    <img 
                      src={item.gambar} 
                      alt={item.nama} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
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
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white leading-tight text-base group-hover:text-amber-400 transition-colors">{item.nama}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-black/40 rounded-xl p-1.5 text-center border border-white/5">
                      <p className="text-[9px] text-slate-500 mb-0.5 uppercase font-bold tracking-wider">Total</p>
                      <p className="font-black text-white text-sm">{item.jumlah_total}</p>
                    </div>
                    <div className="bg-emerald-500/10 rounded-xl p-1.5 text-center border border-emerald-500/20">
                      <p className="text-[9px] text-emerald-500 mb-0.5 uppercase font-bold tracking-wider">Baik</p>
                      <p className="font-black text-emerald-400 text-sm">{item.jumlah_baik}</p>
                    </div>
                    <div className="bg-red-500/10 rounded-xl p-1.5 text-center border border-red-500/20">
                      <p className="text-[9px] text-red-500 mb-0.5 uppercase font-bold tracking-wider">Rusak</p>
                      <p className="font-black text-red-400 text-sm">{item.jumlah_rusak}</p>
                    </div>
                  </div>
                  
                  {item.keterangan && (
                    <p className="text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-lg mt-auto">{item.keterangan}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
