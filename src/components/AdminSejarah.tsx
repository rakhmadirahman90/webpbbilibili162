import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, BookOpen, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminSejarah() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [content, setContent] = useState({
    sejarah_title: '',
    sejarah_accent: '',
    sejarah_desc: '',
    sejarah_img: '', 
  });

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'about_content')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setContent({
          sejarah_title: val.sejarah_title || '',
          sejarah_accent: val.sejarah_accent || '',
          sejarah_desc: val.sejarah_desc || '',
          sejarah_img: val.sejarah_img || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `about/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setContent(prev => ({ ...prev, sejarah_img: publicUrl }));
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Gambar berhasil diunggah', showConfirmButton: false, timer: 2000, background: '#1E293B', color: '#fff' });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal Upload', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get existing about_content
      const { data: existing } = await supabase.from('site_settings').select('value').eq('key', 'about_content').single();
      const existingVal = existing ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : {};

      const updatedVal = { ...existingVal, ...content };

      const { error: errorSettings } = await supabase
        .from('site_settings')
        .upsert({ 
          key: 'about_content', 
          value: updatedVal
        }, { onConflict: 'key' });

      if (errorSettings) throw errorSettings;

      // Update page_contents
      await supabase.from('page_contents').upsert({
        title: 'Sejarah',
        content: content.sejarah_desc,
        image_url: content.sejarah_img,
        updated_at: new Date().toISOString()
      }, { onConflict: 'title' });

      Swal.fire({ icon: 'success', title: 'BERHASIL DISIMPAN', background: '#0F172A', color: '#fff' });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'GAGAL MENYIMPAN', text: error.message, background: '#0F172A', color: '#fff' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#070d1a]"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="h-screen bg-[#070d1a] text-white flex flex-col overflow-hidden p-4 md:p-8">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Kelola <span className="text-blue-500">Sejarah</span></h1>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-blue-600 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition-all">{saving ? '...' : 'SIMPAN'}</button>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0F172A] border border-white/5 rounded-3xl p-4 md:p-8 space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
           <div className="space-y-4">
               <label className="text-xs font-bold text-slate-500 uppercase">Visual Sejarah</label>
               <div className="relative aspect-video bg-black/40 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center">
                  {content.sejarah_img ? <img src={content.sejarah_img} className="w-full h-full object-cover" /> : <label className="cursor-pointer"><ImageIcon size={40}/><input type="file" className="hidden" onChange={handleImageUpload}/></label>}
                  {uploading && <Loader2 className="animate-spin text-blue-500 absolute"/>}
               </div>
           </div>
           <div className="space-y-4">
               <input value={content.sejarah_title} onChange={e => setContent({...content, sejarah_title: e.target.value})} className="w-full bg-black/40 p-4 rounded-xl text-xs font-bold text-white border border-white/5 focus:border-blue-500 outline-none" placeholder="Judul Sejarah"/>
               <input value={content.sejarah_accent} onChange={e => setContent({...content, sejarah_accent: e.target.value})} className="w-full bg-black/40 p-4 rounded-xl text-blue-500 text-xs font-bold border border-white/5 focus:border-blue-500 outline-none" placeholder="Sub Judul / Aksen"/>
               <textarea value={content.sejarah_desc} onChange={e => setContent({...content, sejarah_desc: e.target.value})} className="w-full h-36 bg-black/40 p-4 rounded-xl text-xs text-white border border-white/5 focus:border-blue-500 outline-none" placeholder="Deskripsi Sejarah"/>
           </div>
        </div>
      </div>
    </div>
  );
}
