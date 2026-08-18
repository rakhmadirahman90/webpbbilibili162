import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Save, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';
import { getSiteSetting, saveSiteSetting } from '../utils/siteSettingsHelper';

const SETTING_KEY = 'sambutan_ketua';
const DEFAULT_IMAGE = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png';

const DEFAULT_TEXT = `Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.

Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.

Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.`;

interface SambutanConfig {
  nama?: string;
  jabatan?: string;
  label?: string;
  judul?: string;
  deskripsi?: string;
  foto_url?: string;
  updated_at?: string;
}

export default function AdminSambutanKetua() {
  const [config, setConfig] = useState<SambutanConfig>({
    nama: 'H. Wawan',
    jabatan: 'Ketua Umum PB Bilibili 162',
    label: 'Sambutan Pimpinan',
    judul: 'Sambutan Ketua Umum',
    deskripsi: DEFAULT_TEXT,
    foto_url: DEFAULT_IMAGE
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const raw = await getSiteSetting(SETTING_KEY);
      let parsed: any = raw;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = null; }
      }
      if (parsed && typeof parsed === 'object') {
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Gagal memuat sambutan ketua:', error);
      setMessage('Data belum dapat dimuat. Nilai bawaan digunakan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    const handler = (event: any) => {
      if (event.detail?.key === SETTING_KEY) loadConfig();
    };
    window.addEventListener('site_setting_updated', handler);
    return () => window.removeEventListener('site_setting_updated', handler);
  }, []);

  const update = (key: keyof SambutanConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setMessage('');
  };

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage('File harus berupa gambar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Ukuran foto maksimal 5 MB.');
      return;
    }

    setUploading(true);
    setMessage('Mengunggah foto...');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `sambutan-ketua/ketua-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });
      if (error) throw error;
      const { data } = supabase.storage.from('logos').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('URL foto tidak tersedia.');
      update('foto_url', data.publicUrl);
      setMessage('Foto berhasil diunggah. Klik Simpan Perubahan untuk menerapkannya.');
    } catch (error: any) {
      console.error('Upload sambutan ketua gagal:', error);
      setMessage(`Upload gagal: ${error?.message || 'Terjadi kesalahan.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('Menyimpan ke Supabase...');
    try {
      const now = new Date().toISOString();
      const payload: SambutanConfig = {
        nama: (config.nama || 'H. Wawan').trim(),
        jabatan: (config.jabatan || 'Ketua Umum PB Bilibili 162').trim(),
        label: (config.label || 'Sambutan Pimpinan').trim(),
        judul: (config.judul || 'Sambutan Ketua Umum').trim(),
        deskripsi: (config.deskripsi || '').trim(),
        foto_url: config.foto_url || DEFAULT_IMAGE,
        updated_at: now
      };

      // Supabase is the authoritative store. Do not rely on LocalStorage/server fallback.
      const { data: saved, error: dbError } = await supabase
        .from('site_settings')
        .upsert(
          { key: SETTING_KEY, value: payload, updated_at: now },
          { onConflict: 'key' }
        )
        .select('key, value, updated_at')
        .single();

      if (dbError) throw new Error(`Supabase: ${dbError.message}`);
      if (!saved?.value) throw new Error('Supabase tidak mengembalikan data setelah penyimpanan.');

      // Keep existing realtime/server/local synchronization after the DB write succeeds.
      const syncResult = await saveSiteSetting(SETTING_KEY, payload, 'Sambutan Ketua PB Bilibili 162');
      if (syncResult?.error) throw syncResult.error;

      // Verify the exact row that the landing page reads.
      const { data: verified, error: verifyError } = await supabase
        .from('site_settings')
        .select('value, updated_at')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (verifyError) throw new Error(`Verifikasi Supabase: ${verifyError.message}`);
      if (!verified?.value) throw new Error('Data tersimpan tetapi tidak dapat diverifikasi di Supabase.');

      setConfig(payload);
      setMessage('Foto dan sambutan berhasil tersimpan di Supabase dan siap tampil di landing page.');
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Foto dan teks sambutan telah tersimpan di Supabase serta disinkronkan ke landing page.',
        timer: 1800,
        showConfirmButton: false,
        background: '#0F172A',
        color: '#fff'
      });
    } catch (error: any) {
      console.error('Gagal menyimpan sambutan ketua:', error);
      setMessage(`Gagal menyimpan: ${error?.message || 'Terjadi kesalahan.'}`);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: error?.message || 'Terjadi kesalahan.' });
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setConfig({
      nama: 'H. Wawan',
      jabatan: 'Ketua Umum PB Bilibili 162',
      label: 'Sambutan Pimpinan',
      judul: 'Sambutan Ketua Umum',
      deskripsi: DEFAULT_TEXT,
      foto_url: DEFAULT_IMAGE
    });
    setMessage('Form dikembalikan ke nilai bawaan. Klik Simpan Perubahan untuk menerapkan.');
  };

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 bg-[#070d1a] text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">Pengaturan Website</p>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Kelola Sambutan Ketua</h1>
            <p className="text-sm text-slate-400 mt-2">Atur foto, nama, jabatan, judul, dan teks sambutan yang tampil di landing page.</p>
          </div>
          <button onClick={loadConfig} disabled={loading || saving} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Muat Ulang
          </button>
        </div>

        {message && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-100">
            {message.toLowerCase().includes('gagal') ? <AlertCircle size={18} className="shrink-0 text-red-400" /> : <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />}
            <span>{message}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 sm:p-5 h-fit">
            <h2 className="font-black text-lg mb-4">Foto Ketua</h2>
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
              <img src={config.foto_url || DEFAULT_IMAGE} alt="Foto Ketua" className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => fileRef.current?.click()} disabled={uploading || saving} className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm disabled:opacity-50">
                <ImagePlus size={17} /> {uploading ? 'Upload...' : 'Ganti Foto'}
              </button>
              <button onClick={() => update('foto_url', DEFAULT_IMAGE)} disabled={saving} className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm disabled:opacity-50">
                <Trash2 size={16} /> Bawaan
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            <p className="text-[11px] text-slate-500 mt-3">JPG, PNG atau WebP • maksimal 5 MB. Foto disimpan pada Storage Supabase.</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 sm:p-6">
            <h2 className="font-black text-lg mb-5">Konten Sambutan</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-400">Nama Ketua</span>
                <input value={config.nama || ''} onChange={e => update('nama', e.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-400">Jabatan</span>
                <input value={config.jabatan || ''} onChange={e => update('jabatan', e.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold text-slate-400">Label</span>
                <input value={config.label || ''} onChange={e => update('label', e.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold text-slate-400">Judul Sambutan</span>
                <input value={config.judul || ''} onChange={e => update('judul', e.target.value)} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold text-slate-400">Teks Sambutan Lengkap</span>
                <textarea value={config.deskripsi || ''} onChange={e => update('deskripsi', e.target.value)} rows={16} className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 resize-y" placeholder="Tulis sambutan lengkap..." />
                <span className="text-[11px] text-slate-500">Gunakan baris kosong untuk memisahkan paragraf. Teks akan tampil apa adanya di landing page.</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-slate-800">
              <button onClick={handleSave} disabled={saving || uploading} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-black disabled:opacity-50">
                <Save size={18} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button onClick={resetDefaults} disabled={saving || uploading} className="sm:w-44 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold disabled:opacity-50">
                Reset Form
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
