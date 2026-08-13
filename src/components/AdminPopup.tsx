import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { saveSiteSetting, getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';
import { broadcastDataChange } from '../utils/realtimeHelper';
import { 
  Plus, Trash2, Image as ImageIcon, Save, 
  Loader2, Power, PowerOff, Upload, X, Camera, Edit3, GripVertical, FileText, Download, ExternalLink 
} from 'lucide-react';
import Swal from 'sweetalert2';

export const OFFICIAL_LATEST_POPUP = {
  id: 'popup-1786211047963',
  judul: 'JADWAL LATIHAN RESMI PB BILIBILI 162 PAREPARE',
  deskripsi: `🏸📢 JADWAL LATIHAN RESMI PB BILIBILI 162 PAREPARE 📢🏸\n\nAssalamu'alaikum warahmatullahi wabarakatuh.\n\nHalo seluruh keluarga besar PB Bilibili 162 Parepare 👋\n\nBerikut Jadwal Latihan Terbaru yang berlaku saat ini:\n\n🗓️ Rabu\n🕗 08.00 – 12.00 WITA\n📍 GOR SMAN 4 Parepare\n\n🗓️ Jumat\n🕗 08.00 – 12.00 WITA\n📍 GOR SMAN 4 Parepare\n\n🗓️ Ahad\n🕗 08.00 – 12.00 WITA\n📍 GOR A4 Soreang\n\n🎯 Fokus Latihan: 🏸 Teknik Dasar & Lanjutan\n🏸 Pola Permainan & Strategi\n🏸 Fisik, Sparring, Game, dan Evaluasi\n\n💪 Mari hadir tepat waktu, jaga kekompakan, disiplin, dan semangat berlatih demi meraih prestasi bersama.\n\n🌐 Informasi Lengkap & Aplikasi Resmi PB Bilibili 162: https://pbilibili162.99apps.id/\n\n📲 Melalui aplikasi resmi Anda dapat: ✅ Melihat Jadwal Latihan ✅ Pendaftaran Atlet ✅ Informasi Turnamen ✅ Pengumuman Resmi ✅ Informasi Kegiatan PB Bilibili 162\n\n"Disiplin • Kerja Keras • Juara!" 🏆\n\nHormat kami,\n\nH. Wawan\nKetua PB Bilibili 162 Parepare 💙🏸`,
  url_gambar: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/promosi/popup-1786212468282.png',
  is_active: true,
  urutan: 0
};

// --- TAMBAHAN IMPORT UNTUK DRAG & DROP ---
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PopupConfig {
  id: string;
  url_gambar: string;
  judul: string;
  deskripsi: string;
  is_active: boolean;
  urutan: number;
  file_url?: string; 
}

// --- FUNGSI HELPER: DETEKSI & FORMAT LINK OTOMATIS (VERSI PERBAIKAN FINAL) ---
const renderDescriptionWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  return text.split('\n').map((line, i) => (
    /* PERBAIKAN: break-words dan whitespace-normal memastikan baris baru tercipta */
    <p key={i} className="mb-4 last:mb-0 leading-relaxed text-zinc-700 text-justify whitespace-normal">
      {line.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
          const cleanUrl = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a 
              key={index} 
              href={cleanUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              /* PERBAIKAN UTAMA: 
                 1. inline: agar mengalir seperti teks biasa
                 2. break-all: memutus karakter link di mana saja saat mencapai batas 
              */
              className="text-blue-400 underline hover:text-blue-300 inline break-all whitespace-normal"
            >
              {part} <ExternalLink size={10} className="inline-block mb-0.5 shrink-0" />
            </a>
          );
        }
        return <span key={index} className="break-words">{part}</span>;
      })}
    </p>
  ));
};

// --- KOMPONEN: SORTABLE ITEM ---
function SortablePopupItem({ item, toggleStatus, startEdit, handleDelete, movePosition, totalCount }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative bg-[#0F172A] rounded-2xl sm:rounded-[2.5rem] border-2 overflow-hidden transition-all duration-500 w-full min-w-0 ${item.is_active ? 'border-blue-500/30' : 'border-white/5 opacity-60 grayscale hover:grayscale-0'}`}
    >
      <div className="aspect-[4/5] overflow-hidden relative bg-black w-full min-w-0">
        <div 
          {...attributes} {...listeners}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 z-40 p-2 bg-black/50 backdrop-blur-md rounded-xl cursor-grab active:cursor-grabbing text-white/50 hover:text-blue-500 transition-colors"
          title="Tahan & geser untuk mengubah urutan"
        >
          <GripVertical size={18} />
        </div>

        <img 
            src={item.url_gambar} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            alt={item.judul} 
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />
        <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-30 flex flex-col gap-1.5 sm:gap-2 max-w-[calc(100%-4rem)]">
          <span className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider backdrop-blur-md border w-fit truncate ${item.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900/50 text-white/50 border-white/10'}`}>
            {item.is_active ? `• POSISI ${item.urutan + 1}` : 'NON-AKTIF'}
          </span>

          {/* PILIHAN POSISI INSTAN */}
          <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-blue-500/30 rounded-full px-2.5 py-1 text-white w-fit shadow-lg shadow-black/50">
            <span className="text-[8px] sm:text-[9px] font-black text-amber-400 uppercase tracking-wider whitespace-nowrap">Urutan:</span>
            <select
              value={item.urutan + 1}
              onChange={(e) => movePosition(item.id, Number(e.target.value) - 1)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] sm:text-[10px] rounded-lg px-2 py-0.5 outline-none cursor-pointer transition-all border border-blue-400/30"
            >
              {Array.from({ length: totalCount || 1 }).map((_, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-[#0F172A] text-white font-bold">
                  {idx + 1} {idx === item.urutan ? '(Saat ini)' : ''}
                </option>
              ))}
            </select>
          </div>

          {(item.id === OFFICIAL_LATEST_POPUP.id || item.judul?.toUpperCase().includes('JADWAL LATIHAN')) && (
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-wider backdrop-blur-md flex items-center gap-1 w-fit truncate">
              🏸 Jadwal Latihan
            </span>
          )}
          {item.file_url && (
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-wider backdrop-blur-md flex items-center gap-1 w-fit truncate">
              <Download size={10} /> File Attached
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-7 relative z-30 -mt-12 sm:-mt-20 min-w-0 w-full">
        <h4 className="text-white font-black uppercase text-xs sm:text-sm mb-1.5 sm:mb-2 italic line-clamp-1 tracking-tight break-words max-w-full">{item.judul || 'TANPA JUDUL'}</h4>
        <div className="text-white/50 text-[10px] sm:text-[11px] font-medium mb-4 sm:mb-6 line-clamp-2 leading-relaxed min-h-[2rem] break-words max-w-full overflow-hidden">
            {item.deskripsi}
        </div>
        
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
          <button onClick={() => toggleStatus(item.id, item.is_active)} className={`col-span-1 py-2.5 sm:py-3 rounded-xl flex items-center justify-center transition-all ${item.is_active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-white/5 text-white/40 hover:bg-blue-600 hover:text-white'}`}>
            {item.is_active ? <Power size={15}/> : <PowerOff size={15}/>}
          </button>
          <button onClick={() => startEdit(item)} className="col-span-2 py-2.5 sm:py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/20 truncate">
            <Edit3 size={13} /> EDIT
          </button>
          <button onClick={() => handleDelete(item.id)} className="col-span-1 py-2.5 sm:py-3 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all flex items-center justify-center">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPopup() {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [newPopup, setNewPopup] = useState({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPopups = async (isSilent = false) => {
    if (!isSilent && popups.length === 0) setLoading(true);
    try {
      let sitePopups: PopupConfig[] = [];
      let siteLoaded = false;
      try {
        const siteConfig = await getSiteSetting('popup_config');
        if (siteConfig !== null && siteConfig !== undefined) {
          sitePopups = parsePopupList(siteConfig);
          siteLoaded = true;
        }
      } catch (e) {}

      let dbPopups: PopupConfig[] = [];
      try {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('*')
          .order('urutan', { ascending: true });
        
        if (!error && data) dbPopups = data;
      } catch (e) {}

      const dbMap = new Map(dbPopups.map((p: any) => [p.id, p]));
      const siteMap = new Map(sitePopups.map((p: any) => [p.id, p]));
      const allIds = new Set([...dbPopups.map((p: any) => p.id), ...sitePopups.map((p: any) => p.id)]);

      let merged: PopupConfig[] = [];
      for (const id of allIds) {
        const dbItem = dbMap.get(id);
        const siteItem = siteMap.get(id);
        if (dbItem && siteItem) {
          merged.push({
            ...siteItem,
            ...dbItem,
            judul: dbItem.judul || siteItem.judul || '',
            deskripsi: dbItem.deskripsi || siteItem.deskripsi || '',
            url_gambar: dbItem.url_gambar || siteItem.url_gambar || '',
            file_url: dbItem.file_url || siteItem.file_url || null,
            is_active: dbItem.is_active ?? siteItem.is_active ?? true,
            urutan: dbItem.urutan ?? siteItem.urutan ?? 0
          });
        } else if (dbItem) {
          merged.push(dbItem);
        } else if (siteItem) {
          merged.push(siteItem);
        }
      }

      // Filter out old legacy Aqiqah popups
      merged = merged.map(item => {
        if (!item) return item;
        if (item.id === 'df3aa22e-5f97-4c05-9f04-700ccba35d08' || (item.judul && item.judul.toUpperCase().includes('AQIQAH')) || (item.url_gambar && item.url_gambar.includes('1784303693873'))) {
          return { ...item, is_active: false };
        }
        return item;
      });

      // ALWAYS ensure OFFICIAL_LATEST_POPUP exists in list so admin can manage & toggle it
      const hasSchedulePopup = merged.some(m => m && (m.id === OFFICIAL_LATEST_POPUP.id || (m.url_gambar && m.url_gambar.includes('1786212468282')) || (m.judul && m.judul.includes('JADWAL LATIHAN RESMI'))));
      if (!hasSchedulePopup) {
        merged.unshift(OFFICIAL_LATEST_POPUP);
      }

      // Ensure proper sorting by urutan
      merged.sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));

      setPopups(prev => {
        const currentHash = JSON.stringify(prev);
        const newHash = JSON.stringify(merged);
        if (currentHash === newHash) return prev;
        return merged;
      });
    } catch (err) {
      console.warn("fetchPopups error:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => { 
    fetchPopups(false); 

    const syncInterval = setInterval(() => fetchPopups(true), 3000);

    const channel = supabase
      .channel(`admin_popup_realtime_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (!payload.new || payload.new.key === 'popup_config' || payload.old?.key === 'popup_config') {
          fetchPopups(true);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => {
        fetchPopups(true);
      })
      .subscribe();

    const handleCustomEvent = (e: any) => {
      if (!e.detail?.key || e.detail.key === 'popup_config') fetchPopups(true);
    };
    const handleFocus = () => fetchPopups(true);

    window.addEventListener('site_setting_updated', handleCustomEvent);
    window.addEventListener('app_data_changed', handleFocus);
    window.addEventListener('table_updated_popup_config', handleFocus);
    window.addEventListener('table_updated_konfigurasi_popup', handleFocus);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(syncInterval);
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleCustomEvent);
      window.removeEventListener('app_data_changed', handleFocus);
      window.removeEventListener('table_updated_popup_config', handleFocus);
      window.removeEventListener('table_updated_konfigurasi_popup', handleFocus);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const persistPopups = async (updatedList: PopupConfig[]) => {
    const standardizedList = updatedList.map((item, idx) => ({
      ...item,
      urutan: idx
    }));

    setPopups(standardizedList);

    // 1. Save to site_settings JSON store (Primary source of truth across deployments & devices)
    await saveSiteSetting('popup_config', standardizedList, 'Konfigurasi Popup Promo');

    // 2. Sync to Supabase `konfigurasi_popup` table
    try {
      if (standardizedList.length > 0) {
        const dbUpdates = standardizedList.map(({ id, urutan, judul, deskripsi, url_gambar, is_active, file_url }) => ({
          id,
          urutan: urutan ?? 0,
          judul: judul || '',
          deskripsi: deskripsi || '',
          url_gambar: url_gambar || '',
          is_active: is_active ?? true,
          file_url: file_url || null
        }));
        await supabase.from('konfigurasi_popup').upsert(dbUpdates, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn("Database sync warning (handled via siteSettingsHelper):", err);
    }

    // 3. Broadcast updates
    broadcastDataChange('popup_config', 'UPDATE', standardizedList);
    broadcastDataChange('konfigurasi_popup', 'UPDATE', standardizedList);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'popup_config', value: standardizedList } }));
    window.dispatchEvent(new CustomEvent('table_updated_popup_config'));
    window.dispatchEvent(new CustomEvent('table_updated_konfigurasi_popup'));
  };

  const loadJadwalLatihanTemplate = () => {
    const existing = popups.find(p => p && (p.id === OFFICIAL_LATEST_POPUP.id || (p.judul && p.judul.includes('JADWAL LATIHAN')) || (p.url_gambar && p.url_gambar.includes('1786212468282'))));
    if (existing) {
      startEdit(existing);
    } else {
      setEditingId(OFFICIAL_LATEST_POPUP.id);
      setNewPopup({
        judul: OFFICIAL_LATEST_POPUP.judul,
        deskripsi: OFFICIAL_LATEST_POPUP.deskripsi,
        url_gambar: OFFICIAL_LATEST_POPUP.url_gambar,
        file_url: ''
      });
      setPreviewImage(OFFICIAL_LATEST_POPUP.url_gambar);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = popups.findIndex((p) => p.id === active.id);
    const newIndex = popups.findIndex((p) => p.id === over.id);

    const newOrder = arrayMove(popups, oldIndex, newIndex);
    const updates = newOrder.map((popup, index) => ({
      ...popup,
      urutan: index
    }));

    await persistPopups(updates);

    try {
      const dbUpdates = updates.map(({ id, urutan, judul, deskripsi, url_gambar, is_active, file_url }) => ({
        id, urutan, judul, deskripsi, url_gambar, is_active, file_url
      }));
      await supabase.from('konfigurasi_popup').upsert(dbUpdates);
    } catch (err) {
      console.warn("Supabase reorder sync error (handled via fallback):", err);
    }
  };

  const movePosition = async (itemId: string, targetIndex: number) => {
    const currentIndex = popups.findIndex(p => p.id === itemId);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= popups.length || currentIndex === targetIndex) return;

    const newOrder = arrayMove(popups, currentIndex, targetIndex);
    const updates = newOrder.map((popup, index) => ({
      ...popup,
      urutan: index
    }));

    await persistPopups(updates);

    try {
      const dbUpdates = updates.map(({ id, urutan, judul, deskripsi, url_gambar, is_active, file_url }) => ({
        id, urutan, judul, deskripsi, url_gambar, is_active, file_url
      }));
      await supabase.from('konfigurasi_popup').upsert(dbUpdates);
    } catch (err) {
      console.warn("Supabase reorder sync error (handled via fallback):", err);
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Dipindah ke Urutan ${targetIndex + 1}`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewImage(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `popup-${Date.now()}.${fileExt}`;
      const filePath = `promosi/${fileName}`;
      
      let publicUrl = '';
      try {
        const { error: uploadError } = await supabase.storage.from('identitas-atlet').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      } catch (storageErr) {
        console.warn("Storage upload failed, using Data URL fallback:", storageErr);
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setNewPopup(prev => ({ ...prev, url_gambar: publicUrl }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Gambar berhasil diunggah', showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire('Gagal', err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsFileUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `doc-${Date.now()}.${fileExt}`;
      const filePath = `dokumen-popup/${fileName}`;
      
      let publicUrl = '';
      try {
        const { error: uploadError } = await supabase.storage.from('identitas-atlet').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      } catch (storageErr) {
        console.warn("File storage upload failed, using Data URL fallback:", storageErr);
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setNewPopup(prev => ({ ...prev, file_url: publicUrl }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'File lampiran diunggah', showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire('Gagal upload file', err.message, 'error');
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPopup.url_gambar) return Swal.fire('Opps!', 'Harap unggah gambar terlebih dahulu', 'warning');

    setIsSaving(true);
    
    const payload = {
      judul: newPopup.judul,
      deskripsi: newPopup.deskripsi,
      url_gambar: newPopup.url_gambar,
      file_url: newPopup.file_url || null,
      is_active: true
    };

    let updatedList = [...popups];
    if (editingId) {
      updatedList = updatedList.map(p => p.id === editingId ? { ...p, ...payload } : p);
    } else {
      const newId = 'popup-' + Date.now();
      updatedList.push({
        id: newId,
        ...payload,
        urutan: popups.length
      });
    }

    // Attempt direct Supabase write safely
    try {
      if (editingId) {
        await supabase
          .from('konfigurasi_popup')
          .update(payload)
          .eq('id', editingId);
      } else {
        await supabase
          .from('konfigurasi_popup')
          .insert([{
            ...payload,
            urutan: popups.length
          }]);
      }
    } catch (err: any) {
      console.warn("Database insert/update error (handled via siteSettingsHelper fallback):", err);
    }

    // Save to resilient site_settings & local storage backup
    await persistPopups(updatedList);

    Swal.fire({
      title: 'Berhasil',
      text: editingId ? 'Pop-up diperbarui' : 'Pop-up baru diaktifkan',
      icon: 'success',
      background: '#0F172A',
      color: '#fff'
    });

    setEditingId(null);
    setNewPopup({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
    setPreviewImage(null);
    setIsSaving(false);
  };

  const startEdit = (item: PopupConfig) => {
    setEditingId(item.id);
    setNewPopup({ 
      judul: item.judul, 
      deskripsi: item.deskripsi, 
      url_gambar: item.url_gambar, 
      file_url: item.file_url || '' 
    });
    setPreviewImage(item.url_gambar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewPopup({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
    setPreviewImage(null);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const updatedList = popups.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p);
    await persistPopups(updatedList);

    try {
      await supabase.from('konfigurasi_popup').update({ is_active: !currentStatus }).eq('id', id);
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Pop-up?',
      text: "Tindakan ini tidak dapat dibatalkan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Ya, Hapus!',
      background: '#0F172A',
      color: '#fff'
    });
    if (res.isConfirmed) {
      const updatedList = popups.filter(p => p.id !== id);
      await persistPopups(updatedList);

      try {
        await supabase.from('konfigurasi_popup').delete().eq('id', id);
      } catch (e) {}
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#070d1a] text-white flex flex-col overflow-y-auto lg:overflow-hidden p-2 sm:p-5 md:p-8 font-sans w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full min-w-0">
        <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center shrink-0 w-full overflow-hidden">
          <div className="min-w-0 max-w-full">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter truncate sm:whitespace-normal">
              Kelola <span className="text-blue-500">Pop-up Promo</span>
              </h1>
              <p className="text-white/40 font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1 truncate">Atur tampilan & lampiran landing page</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button 
              type="button"
              onClick={loadJadwalLatihanTemplate} 
              className="px-3 sm:px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-950/20 max-w-full truncate"
            >
              <span>🏸</span> Edit Jadwal Latihan Terbaru
            </button>
            {editingId && (
              <button onClick={cancelEdit} className="px-3 sm:px-5 py-2 bg-rose-600/10 text-rose-500 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all shrink-0">
                Batal Edit
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 sm:space-y-8 pr-0 sm:pr-1 custom-scrollbar pb-10 w-full min-w-0">
          {/* FORM INPUT */}
          <div className={`bg-[#0F172A] rounded-2xl sm:rounded-[2.5rem] border transition-all duration-500 ${editingId ? 'border-blue-500/50 shadow-blue-500/10' : 'border-white/5 shadow-2xl'} overflow-hidden w-full min-w-0`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 w-full min-w-0">
          <div className="lg:col-span-2 bg-black/40 flex items-center justify-center relative overflow-hidden min-h-[260px] sm:min-h-[380px]">
            <div className="w-full h-full relative flex items-center justify-center p-2">
              {previewImage ? (
                <div className="w-full h-full relative min-h-[260px] sm:min-h-[380px] flex items-center justify-center group overflow-hidden rounded-xl">
                  <img src={previewImage} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110" alt="" />
                  <img src={previewImage} className="relative z-10 max-h-[320px] sm:max-h-[460px] w-auto max-w-full object-contain mx-auto rounded-lg shadow-2xl" alt="Preview" />
                  <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <label className="cursor-pointer p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-blue-600 transition-colors">
                      <Camera className="text-white" size={22} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <button onClick={() => {setPreviewImage(null); setNewPopup({...newPopup, url_gambar: ''})}} className="absolute top-3 right-3 z-30 p-2 bg-rose-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center group gap-3 p-6 sm:p-8">
                  <div className="p-4 sm:p-6 bg-blue-600/10 rounded-full text-blue-500 border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                    <Upload size={28} />
                  </div>
                  <div className="text-center">
                    <span className="block text-white font-black text-xs uppercase tracking-widest mb-1">Klik Untuk Unggah Poster</span>
                    <span className="text-white/30 text-[9px] uppercase tracking-tighter italic">Disarankan aspek rasio 4:5</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              )}
            </div>
          </div>
          <form onSubmit={handleSave} className="lg:col-span-3 p-3 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/5 w-full min-w-0">
            <div className="space-y-4">
              <input required className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="Judul Promosi" value={newPopup.judul} onChange={e => setNewPopup({...newPopup, judul: e.target.value})} />
              
              <div className="relative group">
                <textarea 
                   className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 h-32 resize-none transition-all scrollbar-hide" 
                   placeholder="Deskripsi Informasi (Link akan otomatis terdeteksi)" 
                   value={newPopup.deskripsi} 
                   onChange={e => setNewPopup({...newPopup, deskripsi: e.target.value})} 
                />
                {/* PREVIEW TEKS REALTIME DI BAWAH INPUT (DIPERBAIKI UNTUK WRAPPING) */}
                <div className="mt-2 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 overflow-hidden w-full">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Live Preview Deskripsi:</p>
                    <div className="text-[11px] text-white/60 leading-relaxed font-medium break-words w-full whitespace-normal">
                       {renderDescriptionWithLinks(newPopup.deskripsi) || <span className="italic opacity-30">Belum ada deskripsi...</span>}
                    </div>
                </div>
              </div>
              
              {/* INPUT FILE DOWNLOAD */}
              <div className="relative group">
                <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all ${newPopup.file_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-black/20'}`}>
                  <div className={`p-3 rounded-xl ${newPopup.file_url ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/20'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">
                      {newPopup.file_url ? 'File Terlampir' : 'Lampiran Dokumen (Opsional)'}
                    </p>
                    <p className="text-white/30 text-[9px] italic">PDF, DOCX, atau Gambar</p>
                  </div>
                  <label className="cursor-pointer bg-white/5 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-[9px] font-black transition-all">
                    {isFileUploading ? 'UPLOADING...' : newPopup.file_url ? 'GANTI FILE' : 'PILIH FILE'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isFileUploading} />
                  </label>
                </div>
                {newPopup.file_url && (
                  <button type="button" onClick={() => setNewPopup({...newPopup, file_url: ''})} className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <button type="submit" disabled={isSaving || isUploading || isFileUploading} className={`w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-3 text-white ${editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isSaving ? <Loader2 className="animate-spin" /> : editingId ? 'PERBARUI POP-UP' : 'AKTIFKAN POP-UP'}
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
        <h2 className="text-white/40 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.5em] text-center">Pilih Urutan Posisi Instan (1, 2, dst) atau Tahan & Geser Grip</h2>
        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={popups.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {popups.map(item => (
                <SortablePopupItem 
                  key={item.id} 
                  item={item} 
                  toggleStatus={toggleStatus} 
                  startEdit={startEdit} 
                  handleDelete={handleDelete} 
                  movePosition={movePosition}
                  totalCount={popups.length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
        </div>
      </div>
    </div>
  );
}