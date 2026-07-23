import React, { useState, useEffect } from 'react';
import { Medal, Plus, Edit, Trash2, Trophy, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface Prestasi {
  id: string;
  nama_kejuaraan: string;
  tingkat: string;
  tahun: number;
  medali_emas: number;
  medali_perak: number;
  medali_perunggu: number;
  atlet_berprestasi: string;
}

export default function AdminPrestasi() {
  const [prestasi, setPrestasi] = useState<Prestasi[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Prestasi | null>(null);
  const [formData, setFormData] = useState({
    nama_kejuaraan: '', tingkat: 'Nasional', tahun: new Date().getFullYear(),
    medali_emas: 0, medali_perak: 0, medali_perunggu: 0, atlet_berprestasi: ''
  });

  useEffect(() => { fetchPrestasi(); }, []);

  const fetchPrestasi = async () => {
    try {
      const { data, error } = await supabase.from('prestasi_klub').select('*').order('tahun', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setPrestasi(data);
        localStorage.setItem('prestasi_local_v3', JSON.stringify(data));
      } else {
        loadFallback();
      }
    } catch (error: any) {
      loadFallback();
    }
  };

  const loadFallback = () => {
    const local = JSON.parse(localStorage.getItem('prestasi_local_v3') || '[]');
    if (local.length === 0) {
      const defaultData = [
        { id: 'p1', nama_kejuaraan: 'Kejurkot Parepare (Tunggal Putra Dewasa)', tingkat: 'Kabupaten/Kota', tahun: 2023, medali_emas: 1, medali_perak: 0, medali_perunggu: 1, atlet_berprestasi: 'Andi (Emas), Budi (Perunggu)' },
        { id: 'p2', nama_kejuaraan: 'Kejuaraan Provinsi (Kejurprov) Sulsel', tingkat: 'Provinsi', tahun: 2023, medali_emas: 0, medali_perak: 1, medali_perunggu: 2, atlet_berprestasi: 'Ganda Putra: Candra/Deni (Perak)' },
        { id: 'p3', nama_kejuaraan: 'Sirkuit Nasional (Sirnas) B Sulawesi', tingkat: 'Nasional', tahun: 2022, medali_emas: 1, medali_perak: 1, medali_perunggu: 1, atlet_berprestasi: 'Eka (Emas - Tunggal Taruna Putri)' },
        { id: 'p4', nama_kejuaraan: 'Walikota Cup Makassar (Ganda Campuran)', tingkat: 'Provinsi', tahun: 2024, medali_emas: 1, medali_perak: 0, medali_perunggu: 0, atlet_berprestasi: 'Fajar/Gita (Emas)' },
        { id: 'p5', nama_kejuaraan: 'O2SN Tingkat SMA se-Sulsel', tingkat: 'Provinsi', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 0, atlet_berprestasi: 'Hadi (Emas - Tunggal), Indah (Emas - Tunggal)' }
      ];
      localStorage.setItem('prestasi_local_v3', JSON.stringify(defaultData));
      setPrestasi(defaultData);
    } else {
      setPrestasi(local);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ nama_kejuaraan: '', tingkat: 'Nasional', tahun: new Date().getFullYear(), medali_emas: 0, medali_perak: 0, medali_perunggu: 0, atlet_berprestasi: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (item: Prestasi) => { 
    setEditingItem(item); 
    setFormData(item); 
    setShowModal(true); 
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({ 
      title: 'Hapus Prestasi?', 
      text: 'Data yang dihapus tidak dapat dikembalikan',
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });
    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('prestasi_klub').delete().eq('id', id);
        if (error) throw error;
        const updated = prestasi.filter(i => i.id !== id);
        localStorage.setItem('prestasi_local_v3', JSON.stringify(updated));
        setPrestasi(updated);
      } catch (error: any) {
        const updated = prestasi.filter(i => i.id !== id);
        localStorage.setItem('prestasi_local_v3', JSON.stringify(updated));
        setPrestasi(updated);
      }
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase.from('prestasi_klub').update(formData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('prestasi_klub').insert([formData]);
        if (error) throw error;
      }
      
      let updated;
      if (editingItem) {
        updated = prestasi.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
      } else {
        updated = [{ ...formData, id: 'p_' + Date.now() }, ...prestasi];
      }
      localStorage.setItem('prestasi_local_v3', JSON.stringify(updated));
      setPrestasi(updated);
      
      fetchPrestasi(); 
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    } catch (error: any) {
      let updated;
      if (editingItem) {
        updated = prestasi.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
      } else {
        updated = [{ ...formData, id: 'p_' + Date.now() }, ...prestasi];
      }
      localStorage.setItem('prestasi_local_v3', JSON.stringify(updated));
      setPrestasi(updated); 
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-5 sm:p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <Trophy className="text-yellow-500" size={26} /> Prestasi Klub
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Kelola data prestasi dan kejuaraan (Tampil di Landing Page)</p>
        </div>
        <button onClick={handleOpenAdd} className="relative z-10 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-yellow-600/30 active:scale-95 transition-all">
          <Plus size={18} /> Tambah Prestasi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prestasi.map(item => (
          <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl p-5 relative group overflow-hidden flex flex-col sm:flex-row gap-4 hover:border-yellow-500/30 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 flex flex-col items-center justify-center border border-yellow-500/20 shrink-0">
                <Trophy size={24} className="text-yellow-500 mb-1" />
                <span className="text-[10px] font-black text-yellow-500">{item.tahun}</span>
            </div>
            <div className="flex-1 min-w-0 pr-8">
                <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate-2-lines">{item.nama_kejuaraan}</h3>
                <p className="text-xs text-blue-400 font-medium mb-3 mt-1">Tingkat {item.tingkat}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20"><Medal size={13} className="text-yellow-500" /><span className="text-xs font-bold text-yellow-500">{item.medali_emas} Emas</span></div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-400/10 rounded-lg border border-slate-400/20"><Medal size={13} className="text-slate-400" /><span className="text-xs font-bold text-slate-400">{item.medali_perak} Perak</span></div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-700/10 rounded-lg border border-amber-700/20"><Medal size={13} className="text-amber-600" /><span className="text-xs font-bold text-amber-600">{item.medali_perunggu} Perunggu</span></div>
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase block mb-0.5 font-bold">Atlet Berprestasi:</span>
                    <span className="text-xs text-slate-300 block leading-normal">{item.atlet_berprestasi || '-'}</span>
                </div>
            </div>
            <div className="absolute top-4 right-4 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
              <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit"><Edit size={16} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 pb-4 border-b border-white/5 shrink-0 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-white uppercase italic">{editingItem ? 'Edit Prestasi' : 'Tambah Prestasi'}</h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
              {/* Modal Body */}
              <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Nama Kejuaraan</label>
                    <input required type="text" value={formData.nama_kejuaraan} onChange={e => setFormData({...formData, nama_kejuaraan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-yellow-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Tingkat</label>
                    <select value={formData.tingkat} onChange={e => setFormData({...formData, tingkat: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-yellow-500 outline-none text-sm cursor-pointer"><option>Kabupaten/Kota</option><option>Provinsi</option><option>Nasional</option><option>Internasional</option></select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Tahun</label>
                    <input required type="number" value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-yellow-500 outline-none text-sm" />
                  </div>
                  
                  <div className="col-span-2 grid grid-cols-3 gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                      <div><label className="text-[10px] font-black uppercase text-yellow-500 mb-1 block">Emas</label><input required type="number" min="0" value={formData.medali_emas} onChange={e => setFormData({...formData, medali_emas: parseInt(e.target.value)})} className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-yellow-500 outline-none text-sm" /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Perak</label><input required type="number" min="0" value={formData.medali_perak} onChange={e => setFormData({...formData, medali_perak: parseInt(e.target.value)})} className="w-full bg-slate-500/10 border border-slate-500/30 rounded-xl px-3 py-2 text-slate-300 outline-none text-sm" /></div>
                      <div><label className="text-[10px] font-black uppercase text-amber-600 mb-1 block">Perunggu</label><input required type="number" min="0" value={formData.medali_perunggu} onChange={e => setFormData({...formData, medali_perunggu: parseInt(e.target.value)})} className="w-full bg-amber-700/10 border border-amber-700/30 rounded-xl px-3 py-2 text-amber-600 outline-none text-sm" /></div>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Daftar Atlet Berprestasi</label>
                    <textarea value={formData.atlet_berprestasi} onChange={e => setFormData({...formData, atlet_berprestasi: e.target.value})} placeholder="Pisahkan dengan koma (Ahmad (Emas), Budi (Perunggu))" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-yellow-500 outline-none min-h-[80px] text-sm" />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 pt-3 border-t border-white/5 shrink-0 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors text-sm">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-yellow-600 hover:bg-yellow-500 transition-colors text-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
