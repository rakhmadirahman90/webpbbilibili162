import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { saveSiteSetting } from '../utils/siteSettingsHelper';
import { Image as ImageIcon, Loader2, Save, Upload } from 'lucide-react';
import Swal from 'sweetalert2';

interface SambutanConfig {
  nama: string;
  jabatan: string;
  foto_url: string;
  paragraf_1: string;
  paragraf_2: string;
  paragraf_3: string;
  updated_at?: string;
}

const DEFAULT_CONFIG: SambutanConfig = {
  nama: 'H. Wawan',
  jabatan: 'Ketua Umum PB Bilibili 162',
  foto_url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/identitas/1775222807673-ccq2ee.jpg',
  paragraf_1: 'Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.',
  paragraf_2: 'Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.',
  paragraf_3: 'Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.'
};

export default function AdminSambutanKetua() {
  const [form, setForm] = useState<SambutanConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'sambutan_ketua_umum')
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setForm({ ...DEFAULT_CONFIG, ...value });
      }
    } catch (error) {
      console.error('[AdminSambutanKetua] load failed:', error);
      Swal.fire({ icon: 'error', title: 'Gagal Memuat', text: 'Data sambutan tidak dapat dimuat dari Supabase.', background: '#0F172A', color: '#fff' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('admin-sambutan-ketua-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.sambutan_ketua_umum' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `sambutan-ketua/ketua-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setForm((prev) => ({ ...prev, foto_url: data.publicUrl }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Foto berhasil diunggah', showConfirmButton: false, timer: 1800, background: '#1E293B', color: '#fff' });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Upload Gagal', text: error?.message || 'Foto gagal diunggah.', background: '#0F172A', color: '#fff' });
    } finally {
      setUploading(false);
    }
  };

  const update = (field: keyof SambutanConfig, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nama.trim()) return Swal.fire('Perhatian', 'Nama Ketua Umum wajib diisi.', 'warning');
    if (!form.foto_url.trim()) return Swal.fire('Perhatian', 'Foto Ketua Umum wajib tersedia.', 'warning');
    if (!form.paragraf_1.trim() && !form.paragraf_2.trim() && !form.paragraf_3.trim()) return Swal.fire('Perhatian', 'Minimal satu paragraf sambutan harus diisi.', 'warning');

    setSaving(true);
    try {
      const payload = { ...form, nama: form.nama.trim(), jabatan: form.jabatan.trim(), foto_url: form.foto_url.trim() };
      const result = await saveSiteSetting('sambutan_ketua_umum', payload, 'Sambutan Ketua Umum PB Bilibili 162');
      if (result.error) throw result.error;

      window.dispatchEvent(new CustomEvent('sambutan_ketua_updated', { detail: payload }));
      await Swal.fire({ icon: 'success', title: 'Berhasil Disimpan', text: 'Sambutan dan foto Ketua Umum sudah tersimpan dan disinkronkan dengan Landing Page.', background: '#0F172A', color: '#fff', confirmButtonColor: '#2563eb' });
    } catch (error: any) {
      console.error('[AdminSambutanKetua] save failed:', error);
      await Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: error?.message || 'Data sambutan tidak tersimpan.', background: '#0F172A', color: '#fff' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-[500px] flex items-center justify-center bg-[#070d1a]"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-4 sm:p-6 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Pengaturan Website</p>
            <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight">Edit <span className="text-blue-500">Sambutan Ketua Umum</span></h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">Kelola foto, nama, jabatan, dan isi sambutan. Semua perubahan menjadi sumber data Landing Page.</p>
          </div>
          <button type="submit" form="sambutan-ketua-form" disabled={saving || uploading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/20">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

        <form id="sambutan-ketua-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          <section className="bg-[#0F172A] border border-white/10 rounded-2xl p-5 shadow-xl h-fit">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2"><ImageIcon size={16} className="text-blue-400" /> Foto Ketua Umum</h2>
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 mb-4 flex items-center justify-center">
              {form.foto_url ? <img src={form.foto_url} alt={form.nama} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <ImageIcon size={42} className="text-slate-600" />}
            </div>
            <label className="w-full cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-black uppercase tracking-wider">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {uploading ? 'Mengunggah...' : 'Ganti Foto Ketua'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadPhoto(file); event.currentTarget.value = ''; }} />
            </label>
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">Gunakan foto portrait yang jelas. Foto langsung disimpan di Supabase Storage dan URL-nya disimpan bersama konfigurasi sambutan.</p>
          </section>

          <section className="bg-[#0F172A] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Ketua Umum</span><input value={form.nama} onChange={(e) => update('nama', e.target.value)} className="mt-2 w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" /></label>
              <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Jabatan</span><input value={form.jabatan} onChange={(e) => update('jabatan', e.target.value)} className="mt-2 w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" /></label>
            </div>
            {(['paragraf_1', 'paragraf_2', 'paragraf_3'] as const).map((field, index) => (
              <label key={field} className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Paragraf Sambutan {index + 1}</span><textarea value={form[field]} onChange={(e) => update(field, e.target.value)} rows={5} className="mt-2 w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-blue-500 resize-y" /></label>
            ))}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-[11px] text-slate-400 leading-relaxed"><b className="text-blue-300">Sinkronisasi:</b> setelah disimpan, Landing Page membaca <code className="text-blue-300">site_settings → sambutan_ketua_umum</code> dan memperbarui isi/foto secara realtime tanpa perlu mengubah data pendaftaran Ketua Umum.</div>
          </section>
        </form>
      </div>
    </div>
  );
}
