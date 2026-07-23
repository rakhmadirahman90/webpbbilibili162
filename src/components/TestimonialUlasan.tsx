import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  ThumbsUp, 
  ShieldAlert, 
  Sliders, 
  Heart, 
  Award, 
  Users, 
  MessageCircle,
  Filter,
  Check
} from 'lucide-react';
import Swal from 'sweetalert2';

interface Testimonial {
  id: string;
  nama: string;
  peran: string; // Anggota, Orang Tua, Pengunjung, dll.
  rating: number;
  ulasan: string;
  kategori: 'Pelatihan' | 'Fasilitas Lapangan' | 'Kompetisi' | 'Umum';
  tanggal: string;
  approved: boolean;
  sukaCount: number;
  tags: string[];
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    nama: 'Hendra Wijaya',
    peran: 'Orang Tua Atlet',
    rating: 5,
    ulasan: 'Program pelatihan di PB Bili Bili 162 sangat disiplin dan terstruktur. Anak saya menunjukkan kemajuan pesat dalam stamina dan teknik netting hanya dalam waktu 3 bulan latihan rutin.',
    kategori: 'Pelatihan',
    tanggal: '2026-06-15',
    approved: true,
    sukaCount: 24,
    tags: ['Pelatih Profesional', 'Fisik Meningkat', 'Sangat Disiplin']
  },
  {
    id: 't-2',
    nama: 'Rian Ardianto',
    peran: 'Anggota Aktif',
    rating: 5,
    ulasan: 'Fasilitas karpet lapangan standar BWF sangat nyaman di kaki dan mengurangi risiko cedera lutut saat melakukan jumpsmash. Pencahayaan sangat baik, tidak silau.',
    kategori: 'Fasilitas Lapangan',
    tanggal: '2026-06-20',
    approved: true,
    sukaCount: 18,
    tags: ['Karpet BWF', 'Lampu Nyaman', 'Parkir Luas']
  },
  {
    id: 't-3',
    nama: 'Siti Nurhaliza',
    peran: 'Pengunjung Umum',
    rating: 4,
    ulasan: 'Proses booking lapangan lewat aplikasi sangat lancar dan real-time. Lapangannya bersih, kamar mandi rapi, dan kantinnya menyediakan air mineral dingin lengkap. Recommended sekali untuk mabar akhir pekan!',
    kategori: 'Fasilitas Lapangan',
    tanggal: '2026-07-02',
    approved: true,
    sukaCount: 12,
    tags: ['Booking Mudah', 'Bersih & Rapi']
  },
  {
    id: 't-4',
    nama: 'Budi Santoso',
    peran: 'Anggota Senior',
    rating: 5,
    ulasan: 'Turnamen internal bulanan sangat seru dan menantang! Bagan bracket-nya adil, transparan, dan skornya langsung diperbarui real-time. Hubungan silaturahmi antar anggota juga sangat erat di sini.',
    kategori: 'Kompetisi',
    tanggal: '2026-07-10',
    approved: true,
    sukaCount: 15,
    tags: ['Kompetisi Seru', 'Silaturahmi']
  }
];

export default function TestimonialUlasan({ isAdmin }: { isAdmin: boolean }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  
  // Form States
  const [newNama, setNewNama] = useState('');
  const [newPeran, setNewPeran] = useState('Anggota Aktif');
  const [newRating, setNewRating] = useState(5);
  const [newKategori, setNewKategori] = useState<'Pelatihan' | 'Fasilitas Lapangan' | 'Kompetisi' | 'Umum'>('Umum');
  const [newUlasan, setNewUlasan] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const AVAILABLE_TAGS = [
    'Pelatih Profesional', 'Fisik Meningkat', 'Sangat Disiplin',
    'Karpet BWF', 'Lampu Nyaman', 'Parkir Luas',
    'Booking Mudah', 'Bersih & Rapi', 'Kompetisi Seru', 'Silaturahmi'
  ];

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('pb_bilibili_testimonials');
    if (saved) {
      setTestimonials(JSON.parse(saved));
    } else {
      setTestimonials(DEFAULT_TESTIMONIALS);
      localStorage.setItem('pb_bilibili_testimonials', JSON.stringify(DEFAULT_TESTIMONIALS));
    }
  }, []);

  const saveTestimonials = (updated: Testimonial[]) => {
    setTestimonials(updated);
    localStorage.setItem('pb_bilibili_testimonials', JSON.stringify(updated));
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length < 3) {
        setSelectedTags([...selectedTags, tag]);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Maksimal 3 Tag',
          text: 'Anda hanya dapat memilih maksimal 3 tag ulasan.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newUlasan.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Form Belum Lengkap',
        text: 'Wajib mengisi Nama dan Ulasan Anda.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    const newTesti: Testimonial = {
      id: 't-' + Math.floor(1000 + Math.random() * 9000),
      nama: newNama.trim(),
      peran: newPeran,
      rating: newRating,
      ulasan: newUlasan.trim(),
      kategori: newKategori,
      tanggal: new Date().toISOString().split('T')[0],
      approved: isAdmin ? true : false, // Auto-approve if writer is Admin
      sukaCount: 0,
      tags: selectedTags
    };

    const updated = [newTesti, ...testimonials];
    saveTestimonials(updated);

    // Reset Form
    setNewNama('');
    setNewUlasan('');
    setSelectedTags([]);

    Swal.fire({
      icon: 'success',
      title: isAdmin ? 'Ulasan Berhasil Terbit' : 'Terima Kasih Atas Ulasan Anda!',
      text: isAdmin 
        ? 'Testimoni Anda telah sukses diterbitkan ke halaman utama.'
        : 'Ulasan Anda berhasil dikirim dan akan muncul setelah melalui proses moderasi Admin.',
      background: '#0F172A',
      color: '#FFF'
    });
  };

  const handleSuka = (id: string) => {
    const updated = testimonials.map((t) => {
      if (t.id === id) {
        return { ...t, sukaCount: t.sukaCount + 1 };
      }
      return t;
    });
    saveTestimonials(updated);
  };

  const handleApprove = (id: string) => {
    const updated = testimonials.map((t) => {
      if (t.id === id) {
        return { ...t, approved: true };
      }
      return t;
    });
    saveTestimonials(updated);
    Swal.fire({
      icon: 'success',
      title: 'Testimoni Disetujui',
      text: 'Testimoni ini sekarang berstatus aktif dan dipublikasikan.',
      background: '#0F172A',
      color: '#FFF'
    });
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Testimoni?',
      text: "Data testimoni akan terhapus secara permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Hapus',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const filtered = testimonials.filter(t => t.id !== id);
        saveTestimonials(filtered);
        Swal.fire({
          icon: 'success',
          title: 'Terhapus',
          text: 'Data testimoni berhasil dibuang.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  // Filter logic
  const filteredTestimonials = testimonials.filter((t) => {
    // Only show approved ones to normal users, Admins see everything for moderating
    const showByApproval = isAdmin ? true : t.approved;
    const matchesCat = filterCategory === 'Semua' || t.kategori === filterCategory;
    const matchesRating = selectedRating === 0 || t.rating === selectedRating;
    return showByApproval && matchesCat && matchesRating;
  });

  const averageRating = parseFloat(
    (testimonials.filter(t => t.approved).reduce((sum, curr) => sum + curr.rating, 0) / 
    (testimonials.filter(t => t.approved).length || 1)).toFixed(1)
  );

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#101F30] to-[#01050F] rounded-3xl p-6 md:p-8 border border-blue-500/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-purple-500/20 flex items-center gap-1">
                <Heart size={12} className="animate-pulse" /> Community Reviews
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Feedback Hub PB Bili Bili 162</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Testimoni & <span className="text-blue-400">Ulasan Pengguna</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Bagikan pengalaman latihan, kualitas fasilitas lapangan, dan keseruan turnamen Anda bersama PB Bili Bili 162.
            </p>
          </div>

          {/* Macro Rating Circle */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="text-center bg-blue-600/10 p-2.5 rounded-xl border border-blue-500/20">
              <div className="text-2xl font-black text-blue-400 font-mono leading-none">{averageRating}</div>
              <div className="text-[7px] text-slate-400 font-black uppercase mt-1">Skor Rata2</div>
            </div>
            <div>
              <div className="flex text-amber-400 gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} fill={s <= Math.round(averageRating) ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">
                Dari {testimonials.filter(t => t.approved).length} Ulasan Terverifikasi
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: FILTERS & WRITE TESTIMONIAL FORM (4 spans) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Write Review Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
              <MessageSquare size={14} className="text-blue-500" /> Tulis Ulasan Baru
            </h3>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Nama Lengkap</label>
                <input 
                  type="text" 
                  placeholder="Masukkan nama Anda..."
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Peran / Status</label>
                  <select 
                    value={newPeran}
                    onChange={(e) => setNewPeran(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Anggota Aktif">Anggota Aktif</option>
                    <option value="Orang Tua Atlet">Orang Tua Atlet</option>
                    <option value="Pengunjung Umum">Pengunjung Umum</option>
                    <option value="Pelatih Klub">Pelatih Klub</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Kategori Ulasan</label>
                  <select 
                    value={newKategori}
                    onChange={(e) => setNewKategori(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Pelatihan">Pelatihan</option>
                    <option value="Fasilitas Lapangan">Fasilitas Lapangan</option>
                    <option value="Kompetisi">Kompetisi</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

              {/* Star Rating Select */}
              <div>
                <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Rating Bintang</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRating(s)}
                      className="p-1 text-amber-400 hover:scale-110 active:scale-95 transition-transform"
                    >
                      <Star size={20} fill={s <= newRating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag selects (Max 3) */}
              <div>
                <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Pilih Tag (Maksimal 3)</label>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto custom-scrollbar p-1">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all ${
                          isSelected 
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Isi Ulasan</label>
                <textarea 
                  rows={4}
                  placeholder="Ceritakan pengalaman berkesan Anda selama latihan, turnamen, atau sewa lapangan di PB Bili Bili..."
                  value={newUlasan}
                  onChange={(e) => setNewUlasan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-950/40"
              >
                Kirim Ulasan Saya
              </button>
            </form>
          </div>

          {/* Sidebar Category Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-1">
              <Filter size={14} className="text-blue-500" /> Filter Kategori
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {['Semua', 'Pelatihan', 'Fasilitas Lapangan', 'Kompetisi', 'Umum'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 text-[8px] font-black uppercase rounded-lg border transition-all ${
                    filterCategory === cat 
                      ? 'bg-blue-600 text-white border-blue-500' 
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Filter by stars */}
            <div className="pt-2 border-t border-slate-850">
              <label className="text-[8px] font-bold text-slate-500 uppercase block mb-2">Filter Bintang</label>
              <div className="flex gap-1">
                <button 
                  onClick={() => setSelectedRating(0)}
                  className={`px-2 py-1 text-[8px] font-black uppercase rounded border transition-all ${
                    selectedRating === 0 ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 border-slate-850 text-slate-400'
                  }`}
                >
                  Semua
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedRating(s)}
                    className={`px-2 py-1 text-[8px] font-black rounded border transition-all flex items-center gap-0.5 ${
                      selectedRating === s ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950 border-slate-850 text-amber-400'
                    }`}
                  >
                    {s} <Star size={8} fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TESTIMONIAL FEED LIST (8 spans) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Ulasan Aktif ({filteredTestimonials.length})
            </span>
            {isAdmin && (
              <span className="px-2 py-0.5 bg-red-950 border border-red-900 text-[8px] text-red-400 font-black uppercase rounded flex items-center gap-1">
                Moderasi Aktif
              </span>
            )}
          </div>

          {filteredTestimonials.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <MessageCircle size={36} className="text-slate-700 mx-auto mb-2" />
              <div className="text-slate-400 font-black text-xs uppercase">Tidak Ada Ulasan Cocok</div>
              <p className="text-[9px] text-slate-500 mt-1">Silakan sesuaikan filter rating atau kategori ulasan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTestimonials.map((t) => {
                return (
                  <div 
                    key={t.id} 
                    className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
                      !t.approved 
                        ? 'bg-amber-950/15 border-amber-900/40' 
                        : 'bg-slate-900 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    
                    {/* Unapproved watermark warning */}
                    {!t.approved && (
                      <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[7px] font-black uppercase tracking-widest">
                        Menunggu Moderasi
                      </div>
                    )}

                    {/* Review Header Card */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white uppercase">{t.nama}</span>
                          <span className="px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-850 rounded text-[8px] font-bold uppercase">
                            {t.peran}
                          </span>
                          <span className="text-[8px] text-blue-400 font-black uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded">
                            {t.kategori}
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-500 font-bold block mt-1 uppercase">
                          Diposting: {new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Stars */}
                      <div className="flex text-amber-400 gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={11} fill={s <= t.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>

                    {/* Ulasan text content */}
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-3 italic bg-slate-950/40 p-3 rounded-2xl border border-slate-850/30">
                      "{t.ulasan}"
                    </p>

                    {/* Tags block */}
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {t.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-blue-950/30 border border-blue-900/30 text-blue-400 text-[8px] font-semibold rounded-lg uppercase">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review Footer actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-850/30">
                      
                      {/* Like button */}
                      <button
                        onClick={() => handleSuka(t.id)}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <ThumbsUp size={10} className="text-pink-500" /> Suka ({t.sukaCount})
                      </button>

                      {/* Moderation Actions (Admin Only) */}
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          {!t.approved && (
                            <button
                              onClick={() => handleApprove(t.id)}
                              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 hover:text-white border border-emerald-900/40 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                            >
                              <Check size={10} /> Setujui
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 bg-red-950/50 hover:bg-red-900/50 text-red-400 hover:text-white rounded-xl border border-red-900/30 transition-all"
                            title="Hapus Testimoni"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
