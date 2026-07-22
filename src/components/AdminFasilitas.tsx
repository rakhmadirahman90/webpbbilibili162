import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Award, Upload, X, Loader2, ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminFasilitas() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  
  const [content, setContent] = useState({
    fasilitas_title: '',
    fasilitas_img1: '', 
    fasilitas_img2: '', 
    fasilitas_img3: '', 
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
          fasilitas_title: val.fasilitas_title || '',
          fasilitas_img1: val.fasilitas_img1 || '',
          fasilitas_img2: val.fasilitas_img2 || '',
          fasilitas_img3: val.fasilitas_img3 || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `about/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);

      setContent(prev => ({ ...prev, [field]: publicUrl }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Upload Berhasil', showConfirmButton: false, timer: 2000, background: '#1E293B', color: '#fff' });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const { data: existing } = await supabase.from('site_settings').select('value').eq('key', 'about_content').single();
        const existingVal = existing ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : {};

        const updatedVal = { ...existingVal, ...content };

        await supabase.from('site_settings').upsert({ key: 'about_content', value: updatedVal }, { onConflict: 'key' });
        
        await supabase.from('page_contents').upsert({ title: 'Fasilitas', content: content.fasilitas_title, image_url: content.fasilitas_img1 }, { onConflict: 'title' });
        await supabase.from('page_contents').upsert({ title: 'fasilitas_detail_1', content: 'Detail 1', image_url: content.fasilitas_img2 }, { onConflict: 'title' });
        await supabase.from('page_contents').upsert({ title: 'fasilitas_detail_2', content: 'Detail 2', image_url: content.fasilitas_img3 }, { onConflict: 'title' });

        Swal.fire({ icon: 'success', title: 'BERHASIL', background: '#0F172A', color: '#fff' });
    } catch (error: any) {
        Swal.fire({ icon: 'error', title: 'GAGAL', text: error.message, background: '#0F172A', color: '#fff' });
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#070d1a]"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;

  return (
    <div className="h-screen bg-[#070d1a] text-white flex flex-col overflow-hidden p-4 md:p-8">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Kelola <span className="text-amber-500">Fasilitas</span></h1>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-amber-600 rounded-xl font-bold text-xs uppercase hover:bg-amber-700 transition-all">{saving ? '...' : 'SIMPAN'}</button>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0F172A] border border-white/5 rounded-3xl p-4 md:p-8 space-y-6">
        <input value={content.fasilitas_title} onChange={e => setContent({...content, fasilitas_title: e.target.value})} className="w-full bg-black/40 p-4 rounded-xl text-xs font-bold text-white border border-white/5 focus:border-amber-500 outline-none" placeholder="Judul Fasilitas"/>
        <div className="grid md:grid-cols-3 gap-6">
            {['fasilitas_img1', 'fasilitas_img2', 'fasilitas_img3'].map((field) => (
                <div key={field} className="relative aspect-video md:aspect-square bg-black/40 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group">
                    {(content as any)[field] ? (
                      <>
                        <img src={(content as any)[field]} className="w-full h-full object-cover rounded-2xl" />
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-xs font-bold gap-2">
                          <ImageIcon size={18}/> Ganti Foto
                          <input type="file" className="hidden" onChange={e => handleImageUpload(e, field)} />
                        </label>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-colors">
                        <ImageIcon size={36} />
                        <span className="text-[10px] font-bold uppercase">Upload Foto</span>
                        <input type="file" className="hidden" onChange={e => handleImageUpload(e, field)} />
                      </label>
                    )}
                    {uploading === field && <Loader2 className="animate-spin text-amber-500 absolute"/>}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
