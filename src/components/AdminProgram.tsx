import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface ProgramLatihan {
  id: string;
  nama_program: string;
  deskripsi: string;
  hari_latihan: string;
  jam_latihan: string;
}

export default function AdminProgram() {
  const [programs, setPrograms] = useState<ProgramLatihan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProgramLatihan | null>(null);
  const [formData, setFormData] = useState({ nama_program: '', deskripsi: '', hari_latihan: '', jam_latihan: '' });

  useEffect(() => { fetchPrograms(); }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase.from('program_latihan').select('*').order('nama_program', { ascending: true });
      if (error) throw error;
      setPrograms(data || []);
    } catch (error: any) {
      if (error.message.includes('row-level security') || error.code === '42501' || error.code === '42P01') {
        const local = JSON.parse(localStorage.getItem('program_local_v3') || '[]');
        if (local.length === 0) {
          const defaultData = [
            { id: 'prog_1', nama_program: 'Kelas Reguler (Hobi & Pemula)', deskripsi: 'Program untuk pemula dan umum yang ingin berolahraga bulutangkis. Fokus pada kebugaran, pengenalan teknik dasar, dan sparring santai.', hari_latihan: 'Rabu & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
            { id: 'prog_2', nama_program: 'Kelas Prestasi (Pemusatan Atlet)', deskripsi: 'Latihan intensif bagi atlet yang dipersiapkan untuk turnamen/kejuaraan. Fokus pada drill teknik, ketahanan fisik, agility, dan strategi pertandingan.', hari_latihan: 'Jumat & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
            { id: 'prog_3', nama_program: 'Kelas Pembinaan Usia Dini', deskripsi: 'Program khusus pembinaan anak-anak (7-12 tahun). Melatih koordinasi motorik, teknik dasar bulutangkis yang benar, dan kedisiplinan sejak dini.', hari_latihan: 'Rabu & Jumat', jam_latihan: '08:00 - 10:00 WITA' },
            { id: 'prog_4', nama_program: 'Private Training (1 on 1)', deskripsi: 'Latihan eksklusif dengan pelatih untuk fokus memperbaiki teknik spesifik dan mempercepat progres secara individual.', hari_latihan: 'Sesuai Kesepakatan', jam_latihan: 'Fleksibel' },
            { id: 'prog_5', nama_program: 'Mabar Klub (Sparring Day)', deskripsi: 'Sesi pertandingan internal atau mengundang klub lain untuk mengasah mental bertanding seluruh anggota dalam suasana kompetitif namun bersahabat.', hari_latihan: 'Ahad (Akhir Bulan)', jam_latihan: '08:00 - 14:00 WITA' }
          ];
          localStorage.setItem('program_local_v3', JSON.stringify(defaultData));
          setPrograms(defaultData);
        } else setPrograms(local);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ nama_program: '', deskripsi: '', hari_latihan: '', jam_latihan: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (item: ProgramLatihan) => { setEditingItem(item); setFormData(item); setShowModal(true); };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({ title: 'Hapus Program?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus!' });
    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('program_latihan').delete().eq('id', id);
        if (error) throw error;
        setPrograms(programs.filter(i => i.id !== id));
      } catch (error: any) {
        const updated = programs.filter(i => i.id !== id);
        localStorage.setItem('program_local_v3', JSON.stringify(updated));
        setPrograms(updated);
      }
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase.from('program_latihan').update(formData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('program_latihan').insert([formData]);
        if (error) throw error;
      }
      fetchPrograms(); setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    } catch (error: any) {
      let updated;
      if (editingItem) updated = programs.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
      else updated = [...programs, { ...formData, id: 'prog_' + Date.now() }];
      localStorage.setItem('program_local_v3', JSON.stringify(updated));
      setPrograms(updated); setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan (Lokal)', showConfirmButton: false, timer: 1500 });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <Target className="text-fuchsia-500" size={28} /> Program Latihan
          </h1>
          <p className="text-slate-400 text-sm mt-1">Kelola program dan kelas latihan (Tampil di Landing Page)</p>
        </div>
        <button onClick={handleOpenAdd} className="relative z-10 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-fuchsia-600/30 active:scale-95 transition-all">
          <Plus size={18} /> Tambah Program
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map(item => (
          <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl p-5 relative group overflow-hidden flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/10 flex items-center justify-center border border-fuchsia-500/20">
                <Target size={24} className="text-fuchsia-500" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit size={16} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
            <h3 className="font-bold text-white text-lg mb-2">{item.nama_program}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-grow">{item.deskripsi}</p>
            <div className="space-y-2 mt-auto pt-4 border-t border-white/5">
               <div className="flex justify-between items-center bg-black/30 px-3 py-2 rounded-lg">
                   <span className="text-[10px] uppercase text-slate-500 font-bold">Hari:</span>
                   <span className="text-xs text-white font-medium">{item.hari_latihan}</span>
               </div>
               <div className="flex justify-between items-center bg-black/30 px-3 py-2 rounded-lg">
                   <span className="text-[10px] uppercase text-slate-500 font-bold">Jam:</span>
                   <span className="text-xs text-white font-medium">{item.jam_latihan}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase italic mb-4">{editingItem ? 'Edit Program' : 'Tambah Program'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">Nama Program</label><input required type="text" value={formData.nama_program} onChange={e => setFormData({...formData, nama_program: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">Deskripsi Singkat</label><textarea required value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-400 mb-1 block">Hari Latihan</label><input required type="text" placeholder="Cth: Selasa & Kamis" value={formData.hari_latihan} onChange={e => setFormData({...formData, hari_latihan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" /></div>
                  <div><label className="text-xs font-bold text-slate-400 mb-1 block">Jam Latihan</label><input required type="text" placeholder="Cth: 16:00 - 17:30" value={formData.jam_latihan} onChange={e => setFormData({...formData, jam_latihan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
