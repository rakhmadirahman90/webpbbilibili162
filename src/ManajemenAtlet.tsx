import React, { useEffect, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from './supabase';
import Swal from 'sweetalert2';
import { Registrant } from './types';
import AthleteProfileModal from './components/AthleteProfileModal';
import { motion } from 'framer-motion';
import {
  Search,
  User,
  X,
  Award,
  TrendingUp,
  Users,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Trophy,
  Save,
  Loader2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  RefreshCcw,
  Camera,
  Scissors,
  Plus,
  Upload,
  Power,
} from 'lucide-react';

/* Removed Registrant interface */

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const formatNumber = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  if (val === 0) return '';
  const numberString = val.toString().replace(/[^0-9]/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseNumber = (str: string) => {
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean) : 0;
};

export default function ManajemenAtlet() {
  const [atlets, setAtlets] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAtlet, setSelectedAtlet] = useState<Registrant | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStats, setEditingStats] = useState<Partial<Registrant> | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAtlet, setNewAtlet] = useState({
    nama: '',
    whatsapp: '',
    kategori: 'SENIOR',
    domisili: '',
    seed: 'UNSEEDED',
    points: 0,
    bio: 'Atlet PB Bilibili 162',
    prestasi: 'Regular Player',
    foto_url: '',
  });

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cup1SeededMap, setCup1SeededMap] = useState<Map<string, any>>(new Map());

  const [showSuccess, setShowSuccess] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  const BUCKET_NAME = 'atlet_photos';

  const STATUS_OPTIONS = [
    { value: 'aktif', label: 'Aktif' },
    { value: 'tidak aktif', label: 'Tidak Aktif' },
  ];

  const INACTIVE_REASON_OPTIONS = [
    { value: '', label: 'Pilih alasan...' },
    { value: 'Pindah Alamat', label: 'Pindah Alamat' },
    { value: 'Meninggal Dunia', label: 'Meninggal Dunia' },
    { value: 'Pindah Kerja', label: 'Pindah Kerja' },
    { value: 'Pensiun', label: 'Pensiun' },
    { value: 'Cedera / Istirahat', label: 'Cedera / Istirahat' },
    { value: 'Mengundurkan Diri', label: 'Mengundurkan Diri' },
    { value: 'Tidak Aktif Sementara', label: 'Tidak Aktif Sementara' },
    { value: 'Alasan Lainnya', label: 'Alasan Lainnya' },
  ];

  useEffect(() => {
    fetchAtlets();

    const channel = supabase
      .channel('manajemen_atlet_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, () => fetchAtlets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atlet_stats' }, () => fetchAtlets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => fetchAtlets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seeded_players' }, () => fetchAtlets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => fetchAtlets())
      .subscribe();

    return (
    <div className="min-h-full flex flex-col bg-[#061225] font-sans text-white pb-24 lg:pb-6">
      {/* HERO / HEADER */}
      <div className="relative overflow-hidden border-b border-blue-500/10 bg-gradient-to-br from-[#071a36] via-[#08172d] to-[#050d1b]">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute left-1/3 -bottom-32 w-96 h-60 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-300 mb-3">
                <Sparkles size={13} />
                <span className="text-[9px] font-black uppercase tracking-[0.25em]">Pro Database System</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                Manajemen <span className="text-blue-400">Atlet</span>
              </h1>
              <p className="mt-2 text-xs md:text-sm text-slate-400 max-w-xl">
                Kelola database atlet PB BILIBILI 162 dengan data seeded BILIBILI 162 CUP I yang terintegrasi.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full lg:w-auto bg-blue-600 hover:bg-blue-500 text-white px-7 py-4 rounded-2xl shadow-xl shadow-blue-950/40 flex items-center justify-center gap-2 transition-all active:scale-[.98]"
            >
              <Plus size={19} />
              <span className="font-black uppercase text-xs tracking-[0.18em]">Tambah Atlet</span>
            </button>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Atlet', value: atlets.length, icon: Users, cls: 'text-blue-300 bg-blue-500/10 border-blue-400/20' },
              { label: 'Aktif', value: atlets.filter(a => String(a.status || 'aktif').toLowerCase() === 'aktif').length, icon: ShieldCheck, cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20' },
              { label: 'Tidak Aktif', value: atlets.filter(a => String(a.status || '').toLowerCase() !== 'aktif').length, icon: Power, cls: 'text-rose-300 bg-rose-500/10 border-rose-400/20' },
              { label: 'Seeded CUP I', value: atlets.filter(a => Boolean((a as any).seeded_cup1)).length, icon: Trophy, cls: 'text-amber-300 bg-amber-500/10 border-amber-400/20' }
            ].map(({label,value,icon:Icon,cls}) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-sm p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`w-9 h-9 rounded-xl border grid place-items-center ${cls}`}><Icon size={17}/></span>
                  <span className="text-2xl md:text-3xl font-black">{value}</span>
                </div>
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH / FILTER */}
      <div className="sticky top-0 z-20 border-b border-blue-500/10 bg-[#061225]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" size={19} />
            <input
              type="text"
              placeholder="Cari nama atlet, nickname, atau kategori..."
              className="w-full pl-12 pr-5 py-4 bg-[#0b1b34] rounded-2xl border border-blue-500/20 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-1">Status</span>
            <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[9px] font-black text-blue-300">{atlets.length} Semua</span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-[9px] font-black text-emerald-300">{atlets.filter(a => String(a.status || 'aktif').toLowerCase() === 'aktif').length} Aktif</span>
            <span className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-400/20 text-[9px] font-black text-rose-300">{atlets.filter(a => String(a.status || '').toLowerCase() !== 'aktif').length} Tidak Aktif</span>
            <span className="ml-auto px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-[9px] font-black text-amber-300">
              Seeded CUP I: {atlets.filter(a => Boolean((a as any).seeded_cup1)).length}
            </span>
          </div>
        </div>
      </div>

      {/* ATHLETE LIST */}
      <div className="flex-1 px-4 md:px-8 py-5">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="rounded-3xl border border-blue-500/10 bg-[#0b1b34] py-28 text-center">
              <Loader2 className="animate-spin mx-auto text-blue-400 mb-4" size={38} />
              <p className="text-[10px] font-black uppercase italic tracking-[0.3em] text-slate-500">Mengakses Server...</p>
            </div>
          ) : currentItems.length > 0 ? (
            <div className="space-y-3">
              {currentItems.map((atlet) => {
                const isActive = String(atlet.status || 'aktif').toLowerCase() === 'aktif';
                const cup1 = (atlet as any);
                const reason = cup1.alasan_status;
                return (
                  <motion.div
                    key={atlet.id}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedAtlet(atlet)}
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-r from-[#0c203b] to-[#0a172c] hover:border-blue-400/30 shadow-lg shadow-black/10 overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4 p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden bg-[#132947] border border-white/10">
                          {atlet.foto_url ? (
                            <img src={atlet.foto_url} loading="lazy" decoding="async" className="w-full h-full object-cover object-[center_25%]" alt={atlet.nama} />
                          ) : (
                            <User className="w-full h-full p-3 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base md:text-lg font-black uppercase truncate">{atlet.nama}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-rose-500/10 text-rose-300 border-rose-400/20'}`}>
                              {isActive ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mt-1">{atlet.kategori || 'SENIOR'} • Rank #{atlet.rank > 0 ? atlet.rank : '—'}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-400/15 text-[8px] font-black uppercase text-blue-300">Seed {atlet.seed || 'D'}</span>
                            {cup1.seeded_cup1 && <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/15 text-[8px] font-black uppercase text-amber-300">CUP I • {cup1.seeded_division || atlet.seed}</span>}
                            {cup1.seeded_partners?.length > 0 && <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-bold text-slate-400">Partner: {cup1.seeded_partners.join(', ')}</span>}
                          </div>
                          {!isActive && reason && <p className="mt-2 text-[9px] font-semibold text-rose-300">• {reason}</p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 md:min-w-[300px]">
                        <div className="text-left md:text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Poin</p>
                          <p className="text-xl font-black text-blue-300">{Number(atlet.points || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedAtlet(atlet); }} className="w-10 h-10 rounded-xl border border-blue-400/20 bg-blue-500/5 text-blue-300 grid place-items-center hover:bg-blue-500/15"><Award size={17}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingStats(atlet); setIsEditModalOpen(true); }} className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-slate-300 grid place-items-center hover:bg-white/10"><Edit3 size={17}/></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-blue-500/10 bg-[#0b1b34] py-28 text-center">
              <Users className="mx-auto text-slate-600 mb-4" size={42} />
              <p className="font-black text-slate-500 uppercase tracking-widest">Data Tidak Ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER PAGINATION */}
      <div className="fixed lg:relative bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-3 md:p-4 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
            Halaman {currentPage} dari {totalPages}
          </p>

          <div className="flex items-center gap-2 m-auto md:m-0">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all border ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="hidden md:block">
            <button
              onClick={() => fetchAtlets()}
              className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:opacity-70 transition-opacity"
            >
              <RefreshCcw size={14} /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH ATLET BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative flex flex-col md:flex-row overflow-y-auto max-h-[90vh] lg:max-h-none lg:overflow-visible">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 z-10 p-3 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-[40%] bg-slate-50 p-10 border-r border-slate-100 flex flex-col items-center justify-center">
              <div className="w-48 h-48 rounded-[2rem] overflow-hidden bg-slate-200 shadow-inner mb-6 relative group border-4 border-white">
                {newAtlet.foto_url ? (
                  <img
                    src={newAtlet.foto_url}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                ) : (
                  <User className="w-full h-full p-10 text-slate-300" />
                )}
                <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                  <Camera size={30} />
                  <span className="text-[10px] font-black uppercase mt-2">
                    Upload Photo
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                </label>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Rekomendasi: Portrait (4:5)
                <br />
                Maksimal 2MB
              </p>
            </div>

            <form
              onSubmit={handleAddNewAtlet}
              className="w-full md:w-[60%] p-10 md:p-14 space-y-6"
            >
              <h3 className="text-3xl font-black italic uppercase">
                Register <span className="text-blue-600">New Player</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-black text-sm uppercase"
                    value={newAtlet.nama}
                    onChange={(e) =>
                      setNewAtlet({ ...newAtlet, nama: e.target.value })
                    }
                    placeholder="Input Name..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    WhatsApp
                  </label>
                  <input
                    required
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-black text-sm"
                    value={newAtlet.whatsapp}
                    onChange={(e) =>
                      setNewAtlet({ ...newAtlet, whatsapp: e.target.value })
                    }
                    placeholder="08..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Domisili
                  </label>
                  <input
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-black text-sm"
                    value={newAtlet.domisili}
                    onChange={(e) =>
                      setNewAtlet({ ...newAtlet, domisili: e.target.value })
                    }
                    placeholder="City..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Kategori
                  </label>
                  <select
                    disabled
                    className="w-full px-5 py-4 bg-slate-200 rounded-2xl font-black text-sm opacity-70"
                    value={newAtlet.kategori}
                  >
                    <option value="SENIOR">SENIOR</option>
                    <option value="MUDA">MUDA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-5 rounded-3xl border border-blue-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    Skill Seed
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-black text-xs"
                    value={newAtlet.seed}
                    onChange={(e) => handleSeedChange(e.target.value)}
                  >
                    <option value="UNSEEDED">PILIH SEED</option>
                    <option value="C">SEED C (MUDA)</option>
                    <option value="B-">SEED B- (SR)</option>
                    <option value="B+">SEED B+ (SR)</option>
                    <option value="A">SEED A (SR)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    Auto-Points
                  </label>
                  <div className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-between">
                    <Zap size={14} /> {newAtlet.points.toLocaleString()} PTS
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || isSubmitting}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {isSaving || isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}{' '}
                Confirm Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CROPPER MODAL */}
      {isCropping && imageToCrop && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[4/5] bg-zinc-900 rounded-3xl overflow-hidden">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="mt-8 flex gap-4 w-full max-w-lg">
            <button
              onClick={() => setIsCropping(false)}
              className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-xs"
            >
              Batal
            </button>
            <button
              onClick={handleUploadCroppedImage}
              disabled={uploadingImage}
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
            >
              {uploadingImage ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Scissors size={18} />
              )}{' '}
              Terapkan Foto
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {selectedAtlet && (
        <AthleteProfileModal
          atlet={selectedAtlet}
          onClose={() => setSelectedAtlet(null)}
          onEdit={() => {
            setEditingStats(selectedAtlet);
            setIsEditModalOpen(true);
          }}
        />
      )}

      {/* MODAL EDIT PERFORMANCE */}
      {isEditModalOpen && editingStats && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
            <div className="p-10">
              <h3 className="text-2xl font-black italic uppercase mb-8">
                Edit <span className="text-blue-600">Performance</span>
              </h3>
              <form onSubmit={handleUpdateStats} className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Power size={16} className="text-blue-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Keanggotaan Atlet</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                      <select
                        className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs uppercase"
                        value={String((editingStats as any).status || 'aktif').toLowerCase()}
                        onChange={(e) => setEditingStats({ ...editingStats, status: e.target.value, alasan_status: e.target.value === 'aktif' ? '' : ((editingStats as any).alasan_status || '') } as any)}
                      >
                        {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    {String((editingStats as any).status || 'aktif').toLowerCase() === 'tidak aktif' && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alasan Tidak Aktif</label>
                        <select
                          required
                          className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs"
                          value={String((editingStats as any).alasan_status || '')}
                          onChange={(e) => setEditingStats({ ...editingStats, alasan_status: e.target.value } as any)}
                        >
                          {INACTIVE_REASON_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Points
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-5 py-3 bg-slate-100 rounded-xl font-black"
                      value={formatNumber(editingStats.points)}
                      onChange={(e) =>
                        setEditingStats({
                          ...editingStats,
                          points: parseNumber(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Seed Level
                    </label>
                    <select
                      className="w-full px-5 py-3 bg-slate-100 rounded-xl font-black uppercase"
                      value={editingStats.seed || 'UNSEEDED'}
                      onChange={(e) => handleSeedChange(e.target.value, true)}
                    >
                      <option value="UNSEEDED">UNSEEDED</option>
                      <option value="C">SEED C (MUDA)</option>
                      <option value="B-">SEED B- (SR)</option>
                      <option value="B+">SEED B+ (SR)</option>
                      <option value="A">SEED A (SR)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving || isSubmitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3"
                >
                  {isSaving || isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Performance
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] transition-all duration-700 transform ${
          showSuccess
            ? 'translate-y-0 opacity-100'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-blue-500/50 px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-2xl animate-bounce">
            <Zap size={24} className="text-white fill-white" />
          </div>
          <div>
            <h4 className="text-white font-black uppercase tracking-tighter text-xl italic leading-none mb-1">
              {notifMessage}
            </h4>
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
              Database Updated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
