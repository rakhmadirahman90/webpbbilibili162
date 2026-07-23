import React, { useState, useEffect } from 'react';
import { MessageCircleQuestion, Plus, Edit, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface FAQ {
  id: string;
  pertanyaan: string;
  jawaban: string;
  urutan: number;
}

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({ pertanyaan: '', jawaban: '', urutan: 1 });

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase.from('faq').select('*').order('urutan', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        setFaqs(data);
        localStorage.setItem('faq_local_v3', JSON.stringify(data));
      } else {
        loadFallback();
      }
    } catch (error: any) {
      loadFallback();
    }
  };

  const loadFallback = () => {
    const local = JSON.parse(localStorage.getItem('faq_local_v3') || '[]');
    if (local.length === 0) {
      const defaultData = [
        { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman bermain bulutangkis boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula. Pelatih kami akan membimbing mulai dari cara memegang raket (grip), langkah kaki (footwork), hingga teknik pukulan dasar.', urutan: 1 },
        { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan kaos latihan). Untuk iuran bulanan sebesar Rp 100.000 untuk kelas reguler, dan Rp 250.000 untuk kelas prestasi (intensif).', urutan: 2 },
        { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan?', jawaban: 'Anggota wajib membawa raket sendiri, sepatu khusus bulutangkis (non-marking shoes), pakaian olahraga, dan air minum. Shuttlecock sudah disediakan oleh klub selama sesi latihan.', urutan: 3 },
        { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Rabu (08.00 - 12.00 WITA), Jumat (08.00 - 12.00 WITA), dan Ahad (08.00 - 12.00 WITA). Jadwal bisa menyesuaikan jika ada turnamen.', urutan: 4 },
        { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (pembinaan 7-12 tahun), remaja, hingga dewasa/umum tanpa batasan usia maksimal, asalkan dalam kondisi sehat.', urutan: 5 },
        { id: 'f6', pertanyaan: 'Apakah PB Bilibili 162 rutin mengikuti turnamen?', jawaban: 'Ya, klub kami rutin mengirimkan atlet untuk mengikuti kejuaraan tingkat kota, provinsi (Kejurprov), hingga nasional (Sirnas) sesuai kategori usia dan kemampuan.', urutan: 6 }
      ];
      localStorage.setItem('faq_local_v3', JSON.stringify(defaultData));
      setFaqs(defaultData);
    } else {
      setFaqs(local);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ pertanyaan: '', jawaban: '', urutan: faqs.length + 1 });
    setShowModal(true);
  };

  const handleOpenEdit = (item: FAQ) => { 
    setEditingItem(item); 
    setFormData(item); 
    setShowModal(true); 
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({ 
      title: 'Hapus FAQ?', 
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
        const { error } = await supabase.from('faq').delete().eq('id', id);
        if (error) throw error;
        const updated = faqs.filter(i => i.id !== id);
        localStorage.setItem('faq_local_v3', JSON.stringify(updated));
        setFaqs(updated);
      } catch (error: any) {
        const updated = faqs.filter(i => i.id !== id);
        localStorage.setItem('faq_local_v3', JSON.stringify(updated));
        setFaqs(updated);
      }
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase.from('faq').update(formData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faq').insert([formData]);
        if (error) throw error;
      }
      
      let updated;
      if (editingItem) {
        updated = faqs.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
      } else {
        updated = [...faqs, { ...formData, id: 'f_' + Date.now() }];
      }
      updated.sort((a, b) => a.urutan - b.urutan);
      localStorage.setItem('faq_local_v3', JSON.stringify(updated));
      setFaqs(updated);
      
      fetchFaqs(); 
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    } catch (error: any) {
      let updated;
      if (editingItem) {
        updated = faqs.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
      } else {
        updated = [...faqs, { ...formData, id: 'f_' + Date.now() }];
      }
      updated.sort((a, b) => a.urutan - b.urutan);
      localStorage.setItem('faq_local_v3', JSON.stringify(updated));
      setFaqs(updated); 
      setShowModal(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-5 sm:p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
            <MessageCircleQuestion className="text-cyan-500" size={26} /> FAQ
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Kelola tanya jawab (Tampil di Landing Page)</p>
        </div>
        <button onClick={handleOpenAdd} className="relative z-10 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-cyan-600/30 active:scale-95 transition-all">
          <Plus size={18} /> Tambah FAQ
        </button>
      </div>

      <div className="space-y-4">
        {faqs.map(item => (
          <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl p-5 relative group overflow-hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 font-black flex items-center justify-center border border-cyan-500/20 shrink-0 text-sm">
                {item.urutan}
            </div>
            <div className="flex-1 min-w-0 pr-0 sm:pr-8">
                <h3 className="font-bold text-white text-base sm:text-lg mb-1 leading-snug">{item.pertanyaan}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-1.5">{item.jawaban}</p>
            </div>
            <div className="flex gap-1 shrink-0 self-end sm:self-center">
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
              <h3 className="text-base sm:text-lg font-black text-white uppercase italic">{editingItem ? 'Edit FAQ' : 'Tambah FAQ'}</h3>
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
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Urutan Tampil</label>
                  <input required type="number" min="1" value={formData.urutan} onChange={e => setFormData({...formData, urutan: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Pertanyaan</label>
                  <input required type="text" value={formData.pertanyaan} onChange={e => setFormData({...formData, pertanyaan: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Jawaban</label>
                  <textarea required value={formData.jawaban} onChange={e => setFormData({...formData, jawaban: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 outline-none min-h-[120px] text-sm" />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 pt-3 border-t border-white/5 shrink-0 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors text-sm">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors text-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
