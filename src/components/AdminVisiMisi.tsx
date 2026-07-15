import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Target, Rocket, Plus, Trash2, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminVisiMisi() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [content, setContent] = useState({
    vision: '',
    missions: [] as string[],
  });

  const [newMission, setNewMission] = useState('');

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
          vision: val.vision || '',
          missions: Array.isArray(val.missions) ? val.missions : [],
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('site_settings').select('value').eq('key', 'about_content').single();
      const existingVal = existing ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : {};

      const updatedVal = { ...existingVal, ...content };

      await supabase.from('site_settings').upsert({ key: 'about_content', value: updatedVal }, { onConflict: 'key' });
      await supabase.from('page_contents').upsert({ title: 'Visi', content: content.vision, updated_at: new Date().toISOString() }, { onConflict: 'title' });
      await supabase.from('page_contents').upsert({ title: 'Misi', content: content.missions.join('\n'), updated_at: new Date().toISOString() }, { onConflict: 'title' });

      Swal.fire({ icon: 'success', title: 'BERHASIL DISIMPAN', background: '#0F172A', color: '#fff' });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'GAGAL', text: error.message, background: '#0F172A', color: '#fff' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#070d1a]"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="p-8 bg-[#070d1a] min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Kelola <span className="text-purple-500">Visi & Misi</span></h1>
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-700">{saving ? '...' : 'SIMPAN'}</button>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-purple-400"><Target size={20} className="inline mr-2"/>Visi</h2>
            <textarea value={content.vision} onChange={e => setContent({...content, vision: e.target.value})} className="w-full h-40 bg-black/40 p-4 rounded-xl"/>
          </div>

          <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-emerald-400"><Rocket size={20} className="inline mr-2"/>Misi</h2>
            <div className="flex gap-2">
                <input value={newMission} onChange={e => setNewMission(e.target.value)} className="flex-1 bg-black/40 p-3 rounded-xl"/>
                <button onClick={() => { setContent({...content, missions: [...content.missions, newMission]}); setNewMission(''); }} className="p-3 bg-emerald-600 rounded-xl"><Plus size={20}/></button>
            </div>
            <div className="space-y-2">
                {content.missions.map((m, i) => (
                    <div key={i} className="flex justify-between bg-black/40 p-3 rounded-xl">
                        <span>{m}</span>
                        <button onClick={() => setContent({...content, missions: content.missions.filter((_, idx) => idx !== i)})}><Trash2 size={16} className="text-red-500"/></button>
                    </div>
                ))}
            </div>
          </div>
      </div>
    </div>
  );
}
