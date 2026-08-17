import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { saveSiteSetting } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';
import { Edit3, Trash2, Image as ImageIcon, Video, Loader2, X, Power } from 'lucide-react';

interface HeroSlide {
  id: number | string;
  title: string;
  subtitle: string;
  image: string;
  videoUrl?: string;
  poster?: string;
  type?: 'image' | 'video' | string;
  active?: boolean;
  updated_at?: string | number;
  [key: string]: unknown;
}

const DEFAULT_DURATION = 7;
const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

function parseHero(value: any): { settings: { duration: number }; slides: HeroSlide[] } {
  const parsed = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return {}; } })() : value || {};
  const duration = Number(parsed.settings?.duration);
  const slides = Array.isArray(parsed.slides) ? parsed.slides.map((s: any) => ({
    ...s,
    id: s?.id ?? crypto.randomUUID(),
    title: String(s?.title ?? ''),
    subtitle: String(s?.subtitle ?? ''),
    image: String(s?.image ?? ''),
    type: s?.type || (s?.videoUrl ? 'video' : 'image'),
    active: s?.active !== false,
  })).filter((s: HeroSlide) => s.image || s.videoUrl) : [];
  return { settings: { duration: Number.isFinite(duration) && duration >= 5 ? duration : DEFAULT_DURATION }, slides };
}

async function uploadMedia(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  const video = isVideoFile(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || (video ? 'mp4' : 'jpg');
  const safeExt = video ? (['mp4', 'webm', 'mov', 'm4v', 'ogg'].includes(ext) ? ext : 'mp4') : 'jpg';
  const folder = video ? 'hero-sliders' : 'hero';
  const name = `${video ? 'hero-video' : 'hero'}-${Date.now()}.${safeExt}`;
  const upload = await supabase.storage.from('assets').upload(`${folder}/${name}`, file, {
    upsert: false,
    contentType: file.type || (video ? 'video/mp4' : 'image/jpeg'),
    cacheControl: '31536000',
  });
  if (upload.error) throw upload.error;
  const { data } = supabase.storage.from('assets').getPublicUrl(`${folder}/${name}`);
  if (!data?.publicUrl) throw new Error('URL media Hero tidak tersedia.');
  return { url: data.publicUrl, type: video ? 'video' : 'image' };
}

export default function HeroAdmin() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [editSlide, setEditSlide] = useState<HeroSlide | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);

  const fetchHero = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'hero_config').maybeSingle();
      if (error) throw error;
      setSlides(parseHero(data?.value).slides);
    } catch (error: any) {
      console.error('[HeroAdmin] Supabase read failed:', error);
      if (!silent) Swal.fire({ icon: 'error', title: 'Gagal Memuat Hero', text: error?.message || 'Tidak dapat membaca hero dari Supabase.' });
    } finally { if (!silent) setLoading(false); }
  }, []);

  const persist = useCallback(async (nextSlides: HeroSlide[]) => {
    const payload = { settings: { duration: DEFAULT_DURATION }, slides: nextSlides, updated_at: new Date().toISOString() };
    const result = await saveSiteSetting('hero_config', payload);
    if (result.error) throw result.error;
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'hero_config').maybeSingle();
    if (error) throw error;
    const stored = parseHero(data?.value).slides;
    const expected = nextSlides.map(s => String(s.id)).join('|');
    const actual = stored.map(s => String(s.id)).join('|');
    if (expected !== actual) throw new Error('Perubahan belum terverifikasi di Supabase. Tidak dianggap berhasil.');
    setSlides(stored);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'hero_config' } }));
  }, []);

  useEffect(() => {
    void fetchHero();
    const channel = supabase.channel('admin_hero_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.hero_config' }, () => void fetchHero(true))
      .subscribe();
    const refresh = () => void fetchHero(true);
    window.addEventListener('site_setting_updated', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [fetchHero]);

  const activeCount = useMemo(() => slides.filter(s => s.active !== false).length, [slides]);

  const addSlide = async () => {
    if (!newFile || !newTitle.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Isi judul dan pilih gambar/video.' });
      return;
    }
    setSaving(true);
    try {
      const media = await uploadMedia(newFile);
      const next: HeroSlide[] = [...slides, { id: Date.now(), title: newTitle.trim(), subtitle: newSubtitle.trim(), image: media.url, videoUrl: media.type === 'video' ? media.url : undefined, type: media.type, active: true, updated_at: new Date().toISOString() }];
      await persist(next);
      setNewTitle(''); setNewSubtitle(''); setNewFile(null);
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Hero berhasil ditambahkan', showConfirmButton: false, timer: 1800 });
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal menambah Hero', text: error?.message || 'Gagal menyimpan ke Supabase.' });
    } finally { setSaving(false); }
  };

  const toggleActive = async (slide: HeroSlide) => {
    const nextActive = slide.active === false;
    const next = slides.map(s => String(s.id) === String(slide.id) ? { ...s, active: nextActive, updated_at: new Date().toISOString() } : s);
    setSaving(true);
    try {
      await persist(next);
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: nextActive ? 'Hero diaktifkan' : 'Hero dinonaktifkan', text: nextActive ? 'Akan tampil di landing page.' : 'Tidak akan tampil di landing page.', showConfirmButton: false, timer: 1800 });
    } catch (error: any) {
      await fetchHero(true);
      await Swal.fire({ icon: 'error', title: 'Gagal mengubah status', text: error?.message || 'Status Hero tidak tersimpan di Supabase.' });
    } finally { setSaving(false); }
  };

  const openEdit = (slide: HeroSlide) => {
    setEditSlide(slide); setEditTitle(slide.title || ''); setEditSubtitle(slide.subtitle || ''); setEditFile(null);
  };

  const saveEdit = async () => {
    if (!editSlide || !editTitle.trim()) return;
    setSaving(true);
    try {
      let mediaPatch: Partial<HeroSlide> = {};
      if (editFile) {
        const media = await uploadMedia(editFile);
        mediaPatch = { image: media.url, type: media.type, videoUrl: media.type === 'video' ? media.url : undefined };
      }
      const next = slides.map(s => String(s.id) === String(editSlide.id) ? { ...s, ...mediaPatch, title: editTitle.trim(), subtitle: editSubtitle.trim(), updated_at: new Date().toISOString() } : s);
      await persist(next);
      setEditSlide(null); setEditFile(null);
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Hero berhasil diperbarui', showConfirmButton: false, timer: 1800 });
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal edit Hero', text: error?.message || 'Perubahan tidak tersimpan di Supabase.' });
    } finally { setSaving(false); }
  };

  const removeSlide = async (slide: HeroSlide) => {
    const result = await Swal.fire({ title: 'Hapus Hero?', text: `Hapus "${slide.title}" dari konfigurasi Supabase?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#ef4444' });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      await persist(slides.filter(s => String(s.id) !== String(slide.id)));
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Hero berhasil dihapus', showConfirmButton: false, timer: 1800 });
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal menghapus Hero', text: error?.message || 'Penghapusan tidak tersimpan di Supabase.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-black text-white min-h-screen">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black">Kelola Hero</h1><p className="text-xs text-zinc-400 mt-1">Sumber data: Supabase · Realtime aktif · {activeCount} Hero aktif dari {slides.length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-zinc-900/60 p-6 rounded-3xl border border-white/10 space-y-4">
          <h2 className="font-bold">Tambah Hero</h2>
          <label className="block aspect-video bg-black rounded-2xl border-2 border-dashed border-zinc-700 p-2 cursor-pointer overflow-hidden">
            {newFile ? (isVideoFile(newFile) ? <video src={URL.createObjectURL(newFile)} className="w-full h-full object-cover rounded-xl" muted playsInline controls /> : <img src={URL.createObjectURL(newFile)} className="w-full h-full object-cover rounded-xl" alt="Preview" />) : <div className="h-full flex flex-col items-center justify-center text-zinc-500"><ImageIcon/><span className="text-xs mt-2">Pilih gambar / video</span></div>}
            <input type="file" hidden accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg" onChange={e => setNewFile(e.target.files?.[0] || null)} />
          </label>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Judul" className="w-full bg-black p-3 rounded-xl border border-zinc-800 outline-none" />
          <textarea value={newSubtitle} onChange={e => setNewSubtitle(e.target.value)} placeholder="Deskripsi" className="w-full bg-black p-3 rounded-xl border border-zinc-800 outline-none h-24" />
          <button disabled={saving} onClick={addSlide} className="w-full py-3 rounded-xl bg-blue-600 font-bold disabled:opacity-50">{saving ? <Loader2 className="animate-spin mx-auto" /> : 'TAMBAH & PUBLISH'}</button>
        </div>

        <div className="lg:col-span-8 space-y-3">
          {loading ? <div className="p-10 text-center text-zinc-400"><Loader2 className="animate-spin mx-auto mb-2"/>Membaca Supabase...</div> : slides.map(slide => {
            const active = slide.active !== false;
            return <div key={String(slide.id)} className={`p-4 rounded-2xl border flex gap-4 items-center ${active ? 'border-emerald-500/30 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-950/60 opacity-70'}`}>
              {slide.type === 'video' || slide.videoUrl ? <video src={String(slide.videoUrl || slide.image)} className="w-36 aspect-video object-cover rounded-xl bg-black" muted playsInline controls preload="metadata" /> : <img src={slide.image} className="w-36 aspect-video object-cover rounded-xl" alt={slide.title} />}
              <div className="flex-1 min-w-0"><h3 className="font-bold truncate">{slide.title}</h3><p className="text-xs text-zinc-400 line-clamp-2">{slide.subtitle}</p><span className={`text-[10px] font-bold ${active ? 'text-emerald-400' : 'text-zinc-500'}`}>{active ? 'AKTIF · TAMPIL DI LANDING' : 'NONAKTIF · TIDAK TAMPIL'}</span></div>
              <div className="flex items-center gap-1">
                <button disabled={saving} onClick={() => toggleActive(slide)} title={active ? 'Nonaktifkan' : 'Aktifkan'} className={`p-2 rounded-lg ${active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-zinc-500 hover:bg-white/10'}`}><Power size={18}/></button>
                <button disabled={saving} onClick={() => openEdit(slide)} title="Edit" className="p-2 rounded-lg text-blue-400 hover:bg-blue-400/10"><Edit3 size={18}/></button>
                <button disabled={saving} onClick={() => removeSlide(slide)} title="Hapus" className="p-2 rounded-lg text-red-400 hover:bg-red-400/10"><Trash2 size={18}/></button>
              </div>
            </div>;
          })}
          {!loading && !slides.length && <div className="p-10 text-center text-zinc-500">Belum ada Hero di Supabase.</div>}
        </div>
      </div>

      {editSlide && <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditSlide(null)}>
        <div className="w-full max-w-lg bg-zinc-900 rounded-3xl border border-white/10 p-6 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between"><h2 className="text-xl font-black">Edit Hero</h2><button onClick={() => setEditSlide(null)}><X/></button></div>
          <div className="aspect-video rounded-2xl overflow-hidden bg-black">{editSlide.type === 'video' || editSlide.videoUrl ? <video src={String(editSlide.videoUrl || editSlide.image)} className="w-full h-full object-contain" muted controls /> : <img src={editSlide.image} className="w-full h-full object-cover" alt={editSlide.title}/>}</div>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Judul" className="w-full bg-black p-3 rounded-xl border border-zinc-800" />
          <textarea value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} placeholder="Deskripsi" className="w-full bg-black p-3 rounded-xl border border-zinc-800 h-24" />
          <label className="block p-3 rounded-xl border border-dashed border-zinc-700 cursor-pointer text-sm text-zinc-300">Ganti gambar/video (opsional)<input type="file" hidden accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg" onChange={e => setEditFile(e.target.files?.[0] || null)} /></label>
          {editFile && <p className="text-xs text-blue-300">File baru: {editFile.name}</p>}
          <button disabled={saving || !editTitle.trim()} onClick={saveEdit} className="w-full py-3 rounded-xl bg-blue-600 font-bold disabled:opacity-50">{saving ? <Loader2 className="animate-spin mx-auto"/> : 'SIMPAN PERUBAHAN'}</button>
        </div>
      </div>}
    </div>
  );
}
