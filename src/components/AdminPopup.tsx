import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { Loader2, Plus, Trash2, Edit3, Power, PowerOff, Upload, X, Eye, FileText, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import Swal from 'sweetalert2';

const POPUP_TABLE = 'konfigurasi_popup';
const STORAGE_BUCKET = 'identitas-atlet';

export interface PopupConfig {
  id: string;
  url_gambar: string;
  judul: string;
  deskripsi: string;
  is_active: boolean;
  urutan: number;
  file_url?: string | null;
}

export const OFFICIAL_LATEST_POPUP: PopupConfig = {
  id: 'popup-1786211047963',
  judul: 'INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE',
  deskripsi: '📢 INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE 📢\nBersama, Kita Kuat!',
  url_gambar: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/promosi/popup-1786212468282.png',
  is_active: true,
  urutan: 0,
  file_url: null
};

const createPopupId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const timeout = async <T,>(promise: Promise<T>, label: string, ms = 15000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout setelah ${ms / 1000} detik.`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const normalize = (item: any, index: number): PopupConfig => ({
  id: String(item?.id ?? createPopupId()),
  url_gambar: String(item?.url_gambar ?? ''),
  judul: String(item?.judul ?? ''),
  deskripsi: String(item?.deskripsi ?? ''),
  is_active: item?.is_active !== false,
  urutan: Number.isFinite(Number(item?.urutan)) ? Number(item.urutan) : index,
  file_url: item?.file_url ? String(item.file_url) : null
});

const ordered = (items: PopupConfig[]) => items.map((item, index) => ({ ...item, urutan: index }));

async function readPopups(): Promise<PopupConfig[]> {
  const result = await timeout(supabase.from(POPUP_TABLE).select('*').order('urutan', { ascending: true }), 'Membaca popup dari Supabase');
  if (result.error) throw new Error(`Gagal membaca popup: ${result.error.message}`);
  return (result.data || []).map(normalize).sort((a, b) => a.urutan - b.urutan);
}

async function syncPopups(next: PopupConfig[]): Promise<PopupConfig[]> {
  const items = ordered(next).map(item => ({ id: item.id, urutan: item.urutan, judul: item.judul || '', deskripsi: item.deskripsi || '', url_gambar: item.url_gambar || '', is_active: item.is_active !== false, file_url: item.file_url || null }));
  const existingResult = await timeout(supabase.from(POPUP_TABLE).select('id'), 'Memeriksa popup lama di Supabase');
  if (existingResult.error) throw new Error(`Gagal membaca popup lama: ${existingResult.error.message}`);
  const wanted = new Set(items.map(item => item.id));
  const removed = (existingResult.data || []).map((row: any) => String(row.id)).filter(id => !wanted.has(id));
  if (items.length) {
    const upsertResult = await timeout(supabase.from(POPUP_TABLE).upsert(items, { onConflict: 'id' }), 'Menyimpan popup ke Supabase');
    if (upsertResult.error) throw new Error(`Gagal menyimpan popup: ${upsertResult.error.message}`);
  }
  for (const id of removed) {
    const deleteResult = await timeout(supabase.from(POPUP_TABLE).delete().eq('id', id), `Menghapus popup ${id}`);
    if (deleteResult.error) throw new Error(`Gagal menghapus popup ${id}: ${deleteResult.error.message}`);
  }
  const verified = await readPopups();
  const expected = items.map(normalize);
  if (JSON.stringify(verified.map(normalize)) !== JSON.stringify(expected)) throw new Error('Verifikasi gagal: data Supabase berbeda dari data yang baru disimpan.');
  return verified;
}

export default function AdminPopup() {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });

  const resetForm = useCallback(() => { setEditingId(null); setPreviewImage(null); setForm({ url_gambar: '', judul: '', deskripsi: '', file_url: '' }); setErrorMessage(''); }, []);

  const loadPopups = useCallback(async () => {
    setLoading(true); setErrorMessage('');
    try { const rows = await readPopups(); setPopups(rows.length ? rows : [OFFICIAL_LATEST_POPUP]); }
    catch (error: any) { console.error('[AdminPopup] load error:', error); setErrorMessage(error?.message || 'Gagal membaca database popup.'); setPopups([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadPopups();
    const channel = supabase.channel('admin-konfigurasi-popup').on('postgres_changes', { event: '*', schema: 'public', table: POPUP_TABLE }, () => { loadPopups(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPopups]);

  const startEdit = (item: PopupConfig) => { setEditingId(item.id); setForm({ url_gambar: item.url_gambar, judul: item.judul, deskripsi: item.deskripsi, file_url: item.file_url || '' }); setPreviewImage(item.url_gambar || null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; setIsUploading(true); setErrorMessage('');
    try { const ext = file.name.split('.').pop() || 'jpg'; const path = `promosi/popup-${Date.now()}.${ext}`; const upload = await timeout(supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false }), 'Upload gambar'); if (upload.error) throw new Error(`Upload gambar gagal: ${upload.error.message}`); const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl; setForm(prev => ({ ...prev, url_gambar: publicUrl })); setPreviewImage(publicUrl); }
    catch (error: any) { setErrorMessage(error?.message || 'Upload gambar gagal.'); Swal.fire('Gagal Upload', error?.message || 'Upload gambar gagal.', 'error'); }
    finally { setIsUploading(false); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; setIsFileUploading(true); setErrorMessage('');
    try { const ext = file.name.split('.').pop() || 'bin'; const path = `dokumen-popup/doc-${Date.now()}.${ext}`; const upload = await timeout(supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false }), 'Upload lampiran'); if (upload.error) throw new Error(`Upload lampiran gagal: ${upload.error.message}`); const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl; setForm(prev => ({ ...prev, file_url: publicUrl })); }
    catch (error: any) { setErrorMessage(error?.message || 'Upload lampiran gagal.'); Swal.fire('Gagal Upload', error?.message || 'Upload lampiran gagal.', 'error'); }
    finally { setIsFileUploading(false); }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault(); if (isSaving) return;
    if (!form.url_gambar.trim()) { await Swal.fire('Perhatian', 'Harap unggah gambar terlebih dahulu.', 'warning'); return; }
    if (!form.judul.trim()) { await Swal.fire('Perhatian', 'Judul popup wajib diisi.', 'warning'); return; }
    setIsSaving(true); setErrorMessage('');
    try {
      const id = editingId || createPopupId();
      const nextItem: PopupConfig = { id, url_gambar: form.url_gambar.trim(), judul: form.judul.trim(), deskripsi: form.deskripsi, file_url: form.file_url || null, is_active: true, urutan: editingId ? (popups.find(p => p.id === editingId)?.urutan ?? popups.length) : popups.length };
      const next = editingId ? popups.map(item => item.id === editingId ? nextItem : item) : [...popups.filter(item => item.id !== OFFICIAL_LATEST_POPUP.id || item.url_gambar !== OFFICIAL_LATEST_POPUP.url_gambar), nextItem];
      const verified = await syncPopups(next); setPopups(verified); resetForm();
      await Swal.fire({ title: editingId ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan', text: 'Popup sudah tersimpan dan diverifikasi di Supabase.', icon: 'success', background: '#0F172A', color: '#fff' });
    } catch (error: any) {
      console.error('[AdminPopup] save error:', error); const message = error?.message || 'Gagal menyimpan popup ke Supabase.'; setErrorMessage(message); await Swal.fire({ title: 'Gagal Menyimpan', text: message, icon: 'error', background: '#0F172A', color: '#fff' });
    } finally { setIsSaving(false); }
  };

  const toggleStatus = async (id: string) => { if (isSaving) return; const current = popups.find(item => item.id === id); if (!current) return; setIsSaving(true); try { setPopups(await syncPopups(popups.map(item => item.id === id ? { ...item, is_active: !item.is_active } : item))); } catch (error: any) { const message = error?.message || 'Gagal mengubah status popup.'; setErrorMessage(message); await Swal.fire('Gagal', message, 'error'); } finally { setIsSaving(false); } };

  const deletePopup = async (id: string) => { const confirm = await Swal.fire({ title: 'Hapus Pop-up?', text: 'Data akan dihapus permanen dari Supabase.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' }); if (!confirm.isConfirmed || isSaving) return; setIsSaving(true); try { setPopups(await syncPopups(popups.filter(item => item.id !== id))); await Swal.fire({ title: 'Terhapus', text: 'Popup sudah dihapus dari Supabase.', icon: 'success', background: '#0F172A', color: '#fff', timer: 1500, showConfirmButton: false }); } catch (error: any) { const message = error?.message || 'Gagal menghapus popup.'; setErrorMessage(message); await Swal.fire('Gagal', message, 'error'); } finally { setIsSaving(false); } };

  const move = async (id: string, direction: -1 | 1) => { if (isSaving) return; const index = popups.findIndex(item => item.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= popups.length) return; const next = [...popups]; [next[index], next[target]] = [next[target], next[index]]; setIsSaving(true); try { setPopups(await syncPopups(next)); } catch (error: any) { const message = error?.message || 'Gagal mengubah urutan popup.'; setErrorMessage(message); await Swal.fire('Gagal', message, 'error'); } finally { setIsSaving(false); } };

  const activeCount = useMemo(() => popups.filter(p => p.is_active).length, [popups]);

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-3 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center"><div><h1 className="text-xl sm:text-3xl font-black uppercase italic tracking-tight">Kelola <span className="text-blue-500">Pop-up Promo</span></h1><p className="text-white/40 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Supabase sebagai sumber data utama • {activeCount} aktif</p></div><button type="button" onClick={resetForm} disabled={isSaving} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><Plus size={16} /> Tambah Pop-up Baru</button></header>
        {errorMessage && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200 p-4 text-xs font-semibold break-words"><b className="block uppercase text-[10px] tracking-widest mb-1">Database Error</b>{errorMessage}</div>}
        <section className="bg-[#0F172A] rounded-2xl sm:rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl"><div className="grid grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-2 bg-black/30 min-h-[260px] sm:min-h-[380px] flex items-center justify-center p-3">{previewImage ? <div className="relative w-full h-full min-h-[260px] flex items-center justify-center"><img src={previewImage} alt="Preview" className="max-h-[460px] max-w-full object-contain rounded-xl" /><button type="button" onClick={() => { setPreviewImage(null); setForm(prev => ({ ...prev, url_gambar: '' })); }} className="absolute top-2 right-2 p-2 bg-rose-600 rounded-full"><X size={16}/></button></div> : <label className="cursor-pointer w-full min-h-[260px] flex flex-col items-center justify-center gap-3 text-center"><Upload size={32} className="text-blue-500" /><span className="font-black text-xs uppercase tracking-widest">Klik untuk unggah poster</span><span className="text-white/30 text-[9px]">Gambar disimpan di Supabase Storage</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading || isSaving} /></label>}{isUploading && <Loader2 className="absolute animate-spin text-blue-400" size={30} />}</div>
          <form onSubmit={handleSave} className="lg:col-span-3 p-4 sm:p-7 space-y-4"><input required value={form.judul} onChange={e => setForm(prev => ({ ...prev, judul: e.target.value }))} placeholder="Judul Promosi" className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" /><textarea value={form.deskripsi} onChange={e => setForm(prev => ({ ...prev, deskripsi: e.target.value }))} placeholder="Deskripsi informasi" className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-medium outline-none focus:border-blue-500 min-h-[150px] resize-y" />
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-black/20"><FileText size={20} className="text-white/30" /><div className="flex-1 min-w-0"><div className="text-[10px] font-black uppercase tracking-widest">Lampiran Dokumen</div><div className="text-[9px] text-white/30 truncate">{form.file_url ? 'File terlampir' : 'Opsional • PDF, DOCX, gambar'}</div></div><label className="cursor-pointer px-3 py-2 bg-white/5 hover:bg-blue-600 rounded-lg text-[9px] font-black uppercase">{isFileUploading ? 'Uploading...' : 'Pilih File'}<input type="file" className="hidden" onChange={handleFileUpload} disabled={isFileUploading || isSaving} /></label></div>
            <button type="button" onClick={() => { if (!form.url_gambar) return Swal.fire('Perhatian', 'Unggah gambar terlebih dahulu.', 'warning'); Swal.fire({ title: form.judul || 'Pratinjau Popup', html: `<img src="${form.url_gambar}" style="max-width:100%;max-height:55vh;object-fit:contain;border-radius:12px"><p style="text-align:left;white-space:pre-wrap;margin-top:16px">${form.deskripsi.replace(/</g, '&lt;')}</p>`, background: '#0F172A', color: '#fff', confirmButtonText: 'Tutup' }); }} className="w-full py-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Eye size={16}/> Pratinjau Tampilan Live</button>
            <div className="flex gap-2">{editingId && <button type="button" onClick={resetForm} disabled={isSaving} className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest">Batal</button>}<button type="submit" disabled={isSaving || isUploading || isFileUploading} className={`${editingId ? 'flex-[2] bg-emerald-600 hover:bg-emerald-500' : 'flex-1 bg-blue-600 hover:bg-blue-500'} disabled:opacity-60 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2`}>{isSaving ? <><Loader2 className="animate-spin" size={18}/> MENYIMPAN KE SUPABASE...</> : editingId ? <><Edit3 size={16}/> PERBARUI POP-UP</> : <><Plus size={16}/> AKTIFKAN POP-UP</>}</button></div>
          </form></div></section>
        <section><div className="flex items-center gap-3 mb-4"><GripVertical className="text-blue-500" size={18}/><h2 className="text-white/50 font-black text-[10px] uppercase tracking-[0.3em]">Daftar Popup • Data langsung dari Supabase</h2></div>{loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={40}/></div> : popups.length === 0 ? <div className="py-20 text-center text-white/30 text-sm">Belum ada popup di database.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{popups.map((item, index) => <article key={item.id} className={`bg-[#0F172A] rounded-2xl border ${item.is_active ? 'border-blue-500/30' : 'border-white/5 opacity-60'} overflow-hidden`}><div className="aspect-[4/5] bg-black relative"><img src={item.url_gambar} alt={item.judul} className="w-full h-full object-cover" /><span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase ${item.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-black/60 text-white/50'}`}>{item.is_active ? `AKTIF • ${index + 1}` : 'NON-AKTIF'}</span></div><div className="p-4"><h3 className="font-black text-xs uppercase line-clamp-2">{item.judul || 'TANPA JUDUL'}</h3><p className="text-white/40 text-[10px] mt-2 line-clamp-3 whitespace-pre-wrap">{item.deskripsi}</p><div className="grid grid-cols-5 gap-2 mt-4"><button type="button" onClick={() => move(item.id, -1)} disabled={index === 0 || isSaving} className="py-2 rounded-lg bg-white/5 disabled:opacity-30"><ArrowUp size={14} className="mx-auto"/></button><button type="button" onClick={() => move(item.id, 1)} disabled={index === popups.length - 1 || isSaving} className="py-2 rounded-lg bg-white/5 disabled:opacity-30"><ArrowDown size={14} className="mx-auto"/></button><button type="button" onClick={() => toggleStatus(item.id)} disabled={isSaving} className="py-2 rounded-lg bg-white/5 disabled:opacity-30">{item.is_active ? <Power size={14} className="mx-auto"/> : <PowerOff size={14} className="mx-auto"/>}</button><button type="button" onClick={() => startEdit(item)} disabled={isSaving} className="py-2 rounded-lg bg-blue-600/20 text-blue-300 disabled:opacity-30"><Edit3 size={14} className="mx-auto"/></button><button type="button" onClick={() => deletePopup(item.id)} disabled={isSaving} className="py-2 rounded-lg bg-rose-600/10 text-rose-400 disabled:opacity-30"><Trash2 size={14} className="mx-auto"/></button></div></div></article>)}</div>}</section>
      </div>
    </div>
  );
}
