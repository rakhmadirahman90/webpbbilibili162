import React, { useState, useEffect } from 'react';
import { PackageOpen, Plus, Edit, Trash2, Box, Image as ImageIcon, Upload, X } from 'lucide-react';
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
  gambar?: string;
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
    keterangan: '',
    gambar: ''
  });

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
        setItems(getFallbackItems());
      }
    } catch (error: any) {
      setItems(getFallbackItems());
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ nama: '', kategori: 'Perlengkapan Latihan', jumlah_total: 1, jumlah_baik: 1, jumlah_rusak: 0, keterangan: '', gambar: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama,
      kategori: item.kategori,
      jumlah_total: item.jumlah_total,
      jumlah_baik: item.jumlah_baik,
      jumlah_rusak: item.jumlah_rusak,
      keterangan: item.keterangan || '',
      gambar: item.gambar || ''
    });
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
        const updated = items.filter(i => i.id !== id);
        localStorage.setItem('inventaris_local_v3', JSON.stringify(updated));
        setItems(updated);
      } catch (error: any) {
        const updated = items.filter(i => i.id !== id);
        localStorage.setItem('inventaris_local_v3', JSON.stringify(updated));
        setItems(updated);
      }
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTotal = (formData.jumlah_baik || 0) + (formData.jumlah_rusak || 0);
    const finalData = {
      ...formData,
      jumlah_total: finalTotal
    };
    try {
      if (editingItem) {
        const { error } = await supabase.from('inventaris').update(finalData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventaris').insert([finalData]);
        if (error) throw error;
      }
      
      // Sync local list & cache, then fetch the official database copy
      let updated;
      if (editingItem) {
        updated = items.map(i => i.id === editingItem.id ? { ...i, ...finalData } : i);
      } else {
        updated = [...items, { ...finalData, id: 'inv_' + Date.now() }];
      }
      localStorage.setItem('inventaris_local_v3', JSON.stringify(updated));
      setItems(updated);
      
      fetchItems();
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    } catch (error: any) {
      let updated;
      if (editingItem) {
        updated = items.map(i => i.id === editingItem.id ? { ...i, ...finalData } : i);
      } else {
        updated = [...items, { ...finalData, id: 'inv_' + Date.now() }];
      }
      localStorage.setItem('inventaris_local_v3', JSON.stringify(updated));
      setItems(updated);
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({ icon: 'error', title: 'File Terlalu Besar', text: 'Ukuran file maksimal adalah 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, gambar: reader.result as string }));
      };
      reader.readAsDataURL(file);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl overflow-hidden relative group transition-all duration-300 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col h-full">
            {/* Image Header */}
            <div className="relative h-48 bg-black/40 overflow-hidden border-b border-white/5">
              {item.gambar ? (
                <img 
                  src={item.gambar} 
                  alt={item.nama} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/5 to-orange-500/10 text-amber-500/40">
                  <Box size={40} className="stroke-[1.5]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-500">Tidak ada foto</span>
                </div>
              )}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{item.kategori}</span>
              </div>
              <div className="absolute top-3 right-3 flex gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all" title="Edit Barang"><Edit size={14} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all" title="Hapus Barang"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="p-5 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white leading-tight text-lg group-hover:text-amber-400 transition-colors">{item.nama}</h3>
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
                <p className="text-xs text-slate-400 italic bg-white/5 p-2 rounded-lg mt-auto">{item.keterangan}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative my-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 pb-4 border-b border-white/5 shrink-0 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-white uppercase italic">{editingItem ? 'Edit Barang' : 'Tambah Barang'}</h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
              <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Nama Barang</label>
                    <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none text-sm" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Kategori</label>
                    <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none appearance-none text-sm">
                      <option>Perlengkapan Latihan</option>
                      <option>Fasilitas</option>
                      <option>Peralatan</option>
                      <option>Seragam</option>
                      <option>Lainnya</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1 block">Jml Total</label>
                      <input 
                        disabled 
                        type="number" 
                        value={formData.jumlah_baik + formData.jumlah_rusak} 
                        className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-2.5 py-2 text-slate-400 outline-none cursor-not-allowed font-bold text-center text-sm" 
                        title="Total dihitung otomatis dari Kondisi Baik + Rusak"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1 block">Kondisi Baik</label>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        value={formData.jumlah_baik} 
                        onChange={e => {
                          const baik = parseInt(e.target.value) || 0;
                          setFormData({
                            ...formData, 
                            jumlah_baik: baik, 
                            jumlah_total: baik + formData.jumlah_rusak
                          });
                        }} 
                        className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-2.5 py-2 text-emerald-400 outline-none focus:border-emerald-500 text-center text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1 block">Rusak</label>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        value={formData.jumlah_rusak} 
                        onChange={e => {
                          const rusak = parseInt(e.target.value) || 0;
                          setFormData({
                            ...formData, 
                            jumlah_rusak: rusak, 
                            jumlah_total: formData.jumlah_baik + rusak
                          });
                        }} 
                        className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-2.5 py-2 text-red-400 outline-none focus:border-red-500 text-center text-sm" 
                      />
                    </div>
                  </div>

                  {/* Upload Gambar */}
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Foto / Gambar Barang</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
                      {formData.gambar ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/40 group shrink-0 mx-auto sm:mx-0">
                          <img src={formData.gambar} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, gambar: '' })}
                            className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-black text-red-400 uppercase tracking-wider transition-opacity"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border border-dashed border-white/10 bg-black/40 flex flex-col items-center justify-center text-slate-500 shrink-0 mx-auto sm:mx-0">
                          <ImageIcon size={20} className="stroke-[1.5]" />
                          <span className="text-[8px] uppercase font-bold mt-1 tracking-widest text-slate-600">No Image</span>
                        </div>
                      )}
                      <div className="flex-1 text-center sm:text-left">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="upload-gambar"
                        />
                        <label
                          htmlFor="upload-gambar"
                          className="cursor-pointer inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                        >
                          <Upload size={14} />
                          Pilih File Gambar
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, atau JPEG. Ukuran maks 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Keterangan (Opsional)</label>
                    <textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-amber-500 outline-none min-h-[60px] text-sm" />
                  </div>
                </div>
              </div>
              
              <div className="p-5 pt-3 border-t border-white/5 shrink-0 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors text-sm">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors text-sm">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
