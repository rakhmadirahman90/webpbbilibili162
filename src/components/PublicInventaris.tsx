import React, { useState, useEffect } from 'react';
import { PackageOpen, Plus, Edit, Trash2, Box } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface Item {
  id: string;
  nama: string;
  kategori: string;
  jumlah_total: number;
  jumlah_baik: number;
  jumlah_rusak: number;
  keterangan: string;
}

export default function PublicInventaris() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from('inventaris').select('*').order('nama', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      if (error.message.includes('row-level security') || error.code === '42501' || error.code === '42P01') {
        const local = JSON.parse(localStorage.getItem('inventaris_local_v2') || '[]');
        if (local.length === 0) {
          const defaultItems = [
            { id: 'inv_1', nama: 'Shuttlecock Yonex', kategori: 'Perlengkapan Latihan', jumlah_total: 50, jumlah_baik: 40, jumlah_rusak: 10, keterangan: 'Slop baru dan bekas latihan' },
            { id: 'inv_2', nama: 'Net Bulutangkis', kategori: 'Fasilitas', jumlah_total: 4, jumlah_baik: 3, jumlah_rusak: 1, keterangan: 'Net standar turnamen' },
            { id: 'inv_3', nama: 'Tiang Net Portabel', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Besi kokoh, roda masih bagus' },
            { id: 'inv_4', nama: 'Raket Latihan', kategori: 'Peralatan', jumlah_total: 10, jumlah_baik: 8, jumlah_rusak: 2, keterangan: 'Raket cadangan untuk anggota yang senar putus' },
            { id: 'inv_5', nama: 'Cone / Marka Lapangan', kategori: 'Peralatan', jumlah_total: 40, jumlah_baik: 38, jumlah_rusak: 2, keterangan: 'Untuk latihan agility' },
            { id: 'inv_6', nama: 'Tali Skipping', kategori: 'Peralatan', jumlah_total: 15, jumlah_baik: 12, jumlah_rusak: 3, keterangan: 'Untuk pemanasan' },
            { id: 'inv_7', nama: 'Papan Skor Manual', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Papan skor lipat' },
            { id: 'inv_8', nama: 'Kotak P3K', kategori: 'Lainnya', jumlah_total: 1, jumlah_baik: 1, jumlah_rusak: 0, keterangan: 'Lengkap dengan spray pereda nyeri' },
            { id: 'inv_9', nama: 'Keranjang Shuttlecock', kategori: 'Peralatan', jumlah_total: 3, jumlah_baik: 3, jumlah_rusak: 0, keterangan: 'Untuk menyimpan kock latihan' },
            { id: 'inv_10', nama: 'Karpet Lapangan (Vinyl)', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Karpet lapangan standar PBSI' }
          ];
          localStorage.setItem('inventaris_local_v2', JSON.stringify(defaultItems));
          setItems(defaultItems);
        } else {
          setItems(local);
        }
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <PackageOpen className="text-amber-500" size={28} />
            Inventaris Klub
          </h1>
          <p className="text-slate-400 text-sm mt-1">Daftar peralatan dan perlengkapan latihan resmi klub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl p-5 relative group overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Box size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{item.nama}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{item.kategori}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-black/40 rounded-xl p-2 text-center border border-white/5">
                <p className="text-[10px] text-slate-500 mb-0.5">Total</p>
                <p className="font-black text-white">{item.jumlah_total}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-2 text-center border border-emerald-500/20">
                <p className="text-[10px] text-emerald-500 mb-0.5">Baik</p>
                <p className="font-black text-emerald-400">{item.jumlah_baik}</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-2 text-center border border-red-500/20">
                <p className="text-[10px] text-red-500 mb-0.5">Rusak</p>
                <p className="font-black text-red-400">{item.jumlah_rusak}</p>
              </div>
            </div>
            
            {item.keterangan && (
              <p className="text-xs text-slate-400 italic bg-white/5 p-2 rounded-lg">{item.keterangan}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
