import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { saveSiteSetting } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';
import { Trash2, Image as ImageIcon, Video, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

interface HeroSlide {
  id: number | string;
  title: string;
  subtitle: string;
  image: string;
  videoUrl?: string;
  poster?: string;
  type?: 'image' | 'video';
  active?: boolean;
  updated_at?: string | number;
  [key: string]: unknown;
}

const DEFAULT_DURATION = 7;
const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

function normalizeHeroValue(value: any): { settings: { duration: number }; slides: HeroSlide[]; updated_at?: string } {
  const parsed = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return {}; } })() : value || {};
  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const duration = Number(parsed.settings?.duration);
  return { settings: { duration: Number.isFinite(duration) && duration >= 5 ? duration : DEFAULT_DURATION }, slides, updated_at: parsed.updated_at };
}

export default function HeroAdmin() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedIsVideo, setSelectedIsVideo] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempPreview, setTempPreview] = useState<string | null>(null);

  const fetchHeroData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('value, updated_at').eq('key', 'hero_config').maybeSingle();
      if (error) throw error;
      setSlides(normalizeHeroValue(data?.value).slides);
    } catch (error: any) {
      console.error('[AdminHero] Supabase read failed:', error);
      if (!silent) Swal.fire({ icon: 'error', title: 'Gagal Memuat Hero', text: error?.message || 'Data hero tidak dapat dibaca dari Supabase.', background: '#0F172A', color: '#fff' });
    } finally { if (!silent) setLoading(false); }
  }, []);

  const persistHeroConfig = useCallback(async (nextSlides: HeroSlide[]) => {
    const payload = { settings: { duration: DEFAULT_DURATION }, slides: nextSlides, updated_at: new Date().toISOString() };
    const result = await saveSiteSetting('hero_config', payload);
    if (result.error) throw result.error;
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'hero_config').maybeSingle();
    if (error) throw error;
    const stored = normalizeHeroValue(data?.value);
    const storedIds = stored.slides.map(slide => String(slide.id)).join('|');
    const expectedIds = nextSlides.map(slide => String(slide.id)).join('|');
    if (storedIds !== expectedIds) throw new Error('Supabase belum menyimpan konfigurasi Hero yang baru. Perubahan dibatalkan.');
    setSlides(stored.slides);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'hero_config' } }));
  }, []);

  useEffect(() => {
    void fetchHeroData(false);
    const channel = supabase.channel('admin_kelola_hero_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.hero_config' }, () => void fetchHeroData(true)).subscribe();
    const handleCustomEvent = (event: Event) => { if ((event as CustomEvent).detail?.key === 'hero_config') void fetchHeroData(true); };
    const handleFocus = () => void fetchHeroData(true);
    window.addEventListener('site_setting_updated', handleCustomEvent);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchHeroData]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const video = isVideoFile(file);
    setSelectedFile(file);
    setSelectedIsVideo(video);
    setCroppedAreaPixels(null);
    if (video) {
      setImageSrc(null);
      setTempPreview(URL.createObjectURL(file));
      setShowCropper(false);
    } else {
      const reader = new FileReader();
      reader.onload = () => { setImageSrc(reader.result as string); setShowCropper(true); setZoom(1); setCrop({ x: 0, y: 0 }); };
      reader.readAsDataURL(file);
      setTempPreview(null);
    }
    event.target.value = '';
  };

  const onCropComplete = useCallback((_: any, clippedPixels: any) => setCroppedAreaPixels(clippedPixels), []);

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const image = new Image(); image.src = imageSrc;
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width; canvas.height = croppedAreaPixels.height;
      ctx?.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
      setTempPreview(canvas.toDataURL('image/jpeg')); setShowCropper(false);
    } catch (error) { console.error(error); }
  };

  const handlePublish = async () => {
    if (!selectedFile || !newTitle.trim() || (!selectedIsVideo && !tempPreview)) {
      Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Isi judul dan pilih file gambar/video Hero terlebih dahulu.', confirmButtonColor: '#3B82F6', background: '#0F172A', color: '#fff' });
      return;
    }
    setUploading(true);
    try {
      let publicUrl = '';
      let type: 'image' | 'video' = selectedIsVideo ? 'video' : 'image';
      if (selectedIsVideo) {
        const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const safeExtension = ['mp4', 'webm', 'mov', 'm4v', 'ogg'].includes(extension) ? extension : 'mp4';
        const fileName = `hero-video-${Date.now()}.${safeExtension}`;
        const upload = await supabase.storage.from('assets').upload(`hero-sliders/${fileName}`, selectedFile, { upsert: false, contentType: selectedFile.type || 'video/mp4', cacheControl: '31536000' });
        if (upload.error) throw upload.error;
        publicUrl = supabase.storage.from('assets').getPublicUrl(`hero-sliders/${fileName}`).data.publicUrl;
      } else {
        const res = await fetch(tempPreview!); const blob = await res.blob();
        const file = await imageCompression(new File([blob], 'hero.jpg'), { maxSizeMB: 0.8 });
        const fileName = `hero-${Date.now()}.jpg`;
        const upload = await supabase.storage.from('assets').upload(`hero/${fileName}`, file, { upsert: false, contentType: 'image/jpeg', cacheControl: '31536000' });
        if (upload.error) throw upload.error;
        publicUrl = supabase.storage.from('assets').getPublicUrl(`hero/${fileName}`).data.publicUrl;
      }
      if (!publicUrl) throw new Error('URL media Hero tidak tersedia.');
      const updated: HeroSlide[] = [...slides, { id: Date.now(), title: newTitle.trim(), subtitle: newSubtitle.trim(), image: publicUrl, videoUrl: selectedIsVideo ? publicUrl : undefined, type, active: true, updated_at: new Date().toISOString() }];
      await persistHeroConfig(updated);
      if (tempPreview?.startsWith('blob:')) URL.revokeObjectURL(tempPreview);
      setSelectedFile(null); setSelectedIsVideo(false); setTempPreview(null); setImageSrc(null); setNewTitle(''); setNewSubtitle('');
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${type === 'video' ? 'Video' : 'Slide'} Hero tersimpan di Supabase`, showConfirmButton: false, timer: 2000 });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal Publish', text: error?.message || 'Gagal menyimpan media Hero ke Supabase.', confirmButtonColor: '#EF4444', background: '#0F172A', color: '#fff' });
    } finally { setUploading(false); }
  };

  const handleDelete = async (slide: HeroSlide) => {
    const result = await Swal.fire({ title: 'Hapus Slide?', text: 'Apakah Anda yakin ingin menghapus slide ini secara permanen?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!result.isConfirmed) return;
    try {
      setUploading(true);
      await persistHeroConfig(slides.filter(item => String(item.id) !== String(slide.id)));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Slide berhasil dihapus dari Supabase', showConfirmButton: false, timer: 2000 });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: error?.message || 'Supabase gagal menyimpan penghapusan Hero.', background: '#0F172A', color: '#fff' });
    } finally { setUploading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-black text-white min-h-screen">
      {showCropper && imageSrc && <div className="fixed inset-0 z-[99999] bg-[#070d1a] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#0b1224]"><h2 className="font-bold text-blue-500 uppercase italic">Crop Image 16:9</h2><button onClick={() => setShowCropper(false)} aria-label="Tutup cropper"><X size={28}/></button></div>
        <div className="relative flex-grow w-full bg-[#070d1a]"><Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} classes={{ containerClassName: 'min-h-[300px] w-full h-full' }} style={{ containerStyle: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }, cropAreaStyle: { border: '2px solid #3b82f6', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' } }} /></div>
        <div className="p-6 bg-black border-t border-zinc-800 flex flex-col items-center gap-6"><div className="flex items-center gap-4 w-full max-w-md"><ZoomOut size={20}/><input type="range" min={1} max={3} step={0.1} value={zoom} onChange={event => setZoom(Number(event.target.value))} className="flex-grow accent-blue-600"/><ZoomIn size={20}/></div><button onClick={handleConfirmCrop} className="bg-blue-600 px-10 py-3 rounded-full font-bold">TERAPKAN POTONGAN</button></div>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5">
          <div onClick={() => document.getElementById('file-input')?.click()} className="aspect-video bg-black rounded-3xl mb-6 flex items-center justify-center border-2 border-dashed border-zinc-800 overflow-hidden cursor-pointer">
            {tempPreview ? (selectedIsVideo ? <video src={tempPreview} className="w-full h-full object-cover" muted playsInline controls /> : <img src={tempPreview} className="w-full h-full object-cover" alt="Preview Hero"/>) : <div className="flex flex-col items-center gap-2 opacity-30"><ImageIcon size={40}/><Video size={22}/></div>}
            <input id="file-input" type="file" hidden accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg" onChange={onFileChange}/>
          </div>
          <div className="space-y-4"><input placeholder="Judul" value={newTitle} onChange={event => setNewTitle(event.target.value)} className="w-full bg-black p-4 rounded-xl border border-zinc-800 focus:border-blue-500 outline-none"/><textarea placeholder="Deskripsi" value={newSubtitle} onChange={event => setNewSubtitle(event.target.value)} className="w-full bg-black p-4 rounded-xl border border-zinc-800 h-24 focus:border-blue-500 outline-none"/><button onClick={handlePublish} disabled={uploading} className="w-full bg-blue-600 py-4 rounded-xl font-bold uppercase tracking-widest">{uploading ? <Loader2 className="animate-spin mx-auto"/> : 'PUBLISH SLIDE'}</button></div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {loading ? <div className="p-10 text-center text-zinc-400"><Loader2 className="animate-spin mx-auto mb-3"/>Memuat Hero dari Supabase...</div> : slides.map(slide => (
            <div key={String(slide.id)} className="bg-zinc-900/30 p-4 rounded-3xl border border-white/5 flex gap-4 items-center">
              {slide.type === 'video' || slide.videoUrl ? <video src={String(slide.videoUrl || slide.image)} className="w-32 aspect-video object-cover rounded-xl bg-black" muted playsInline controls preload="metadata" /> : <img src={slide.image} className="w-32 aspect-video object-cover rounded-xl" alt={slide.title || 'Hero slide'}/>} 
              <div className="flex-grow"><h4 className="font-bold">{slide.title}</h4><p className="text-xs text-zinc-400 mt-1">{slide.subtitle}</p><span className="text-[10px] uppercase tracking-widest text-emerald-400">{slide.active === false ? 'NONAKTIF' : 'AKTIF · REALTIME SUPABASE'}</span></div>
              <button disabled={uploading} onClick={() => handleDelete(slide)} className="p-3 text-red-500 disabled:opacity-40" aria-label={`Hapus ${slide.title}`}><Trash2/></button>
            </div>
          ))}
          {!loading && slides.length === 0 && <div className="p-10 text-center text-zinc-500">Belum ada slide Hero aktif di Supabase.</div>}
        </div>
      </div>
    </div>
  );
}
