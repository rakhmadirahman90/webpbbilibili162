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

export default function AdminInventaris() {
  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kategori: 'Perlengkapan Latihan',
    jumlah_total: 1,
    jumlah_baik: 1,
    jumlah_rusak: 0,
    keterangan: ''
  });

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

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ nama: '', kategori: 'Perlengkapan Latihan', jumlah_total: 1, jumlah_baik: 1, jumlah_rusak: 0, keterangan: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Barang?',
      text: "Data inventaris ini akan dihapus permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('inventaris').delete().eq('id', id);
        if (error) throw error;
        setItems(items.filter(i => i.id !== id));
      } catch (error: any) {
        if (error.message.includes('row-level security') || error.code === '42501' || error.code === '42P01') {
          const updated = items.filter(i => i.id !== id);
          localStorage.setItem('inventaris_local_v2', JSON.stringify(updated));
          setItems(updated);
        }
      }
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase.from('inventaris').update(formData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventaris').insert([formData]);
        if (error) throw error;
      }
      fetchItems();
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    } catch (error: any) {
      if (error.message.includes('row-level security') || error.code === '42501' || error.code === '42P01') {
        let updated;
        if (editingItem) {
          updated = items.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
        } else {
          updated = [...items, { ...formData, id: 'inv_' + Date.now() }];
        }
        localStorage.setItem('inventaris_local_v2', JSON.stringify(updated));
        setItems(updated);
        setShowModal(false);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan (Lokal)', showConfirmButton: false, timer: 1500 });
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <PackageOpen className="text-amber-500" size={28} />
            Inventaris Klub
          </h1>
          <p className="text-slate-400 text-sm mt-1">Kelola peralatan dan perlengkapan latihan</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="relative z-10 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
        >
          <Plus size={18} />
          Tambah Barang
        </button>
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
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit size={14} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <h3 className="text-lg font-black text-white uppercase italic mb-4">{editingItem ? 'Edit Barang' : 'Tambah Barang'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Nama Barang</label>
                  <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Kategori</label>
                  <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none appearance-none">
                    <option>Perlengkapan Latihan</option>
                    <option>Fasilitas</option>
                    <option>Seragam</option>
                    <option>Lainnya</option>
                  </select>
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Jml Total</label>
                    <input required type="number" min="0" value={formData.jumlah_total} onChange={e => setFormData({...formData, jumlah_total: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Kondisi Baik</label>
                    <input required type="number" min="0" value={formData.jumlah_baik} onChange={e => setFormData({...formData, jumlah_baik: parseInt(e.target.value)})} className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-emerald-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Rusak</label>
                    <input required type="number" min="0" value={formData.jumlah_rusak} onChange={e => setFormData({...formData, jumlah_rusak: parseInt(e.target.value)})} className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 outline-none" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Keterangan (Opsional)</label>
                  <textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none min-h-[80px]" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
