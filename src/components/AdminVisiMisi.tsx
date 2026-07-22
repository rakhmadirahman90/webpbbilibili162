import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Target, Rocket, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminVisiMisi() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [content, setContent] = useState({
    vision: '',
    missions: [] as string[],
  });

  const [newMission, setNewMission] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

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
    <div className="h-screen bg-[#070d1a] text-white flex flex-col overflow-hidden p-4 md:p-8">
      <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0">
        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Kelola <span className="text-purple-500">Visi & Misi</span></h1>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-purple-600 rounded-xl font-bold text-xs uppercase hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25">{saving ? '...' : 'SIMPAN'}</button>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 bg-[#0F172A] border border-white/5 rounded-3xl p-4 md:p-8">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4 flex flex-col">
            <h2 className="text-base md:text-lg font-bold text-purple-400 flex items-center gap-2"><Target size={18}/>Visi Klub</h2>
            <textarea value={content.vision} onChange={e => setContent({...content, vision: e.target.value})} className="w-full flex-1 min-h-[140px] bg-zinc-900 border border-white/10 p-4 rounded-xl text-xs md:text-sm text-white focus:border-purple-500 outline-none leading-relaxed" placeholder="Tuliskan Visi Klub..."/>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4 flex flex-col min-h-[300px]">
            <h2 className="text-base md:text-lg font-bold text-emerald-400 flex items-center gap-2"><Rocket size={18}/>Poin Misi</h2>
            <div className="flex gap-2 shrink-0">
                <input value={newMission} onChange={e => setNewMission(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && newMission.trim()) { setContent({...content, missions: [...content.missions, newMission]}); setNewMission(''); } }} className="flex-1 bg-zinc-900 border border-white/10 p-3 rounded-xl text-xs md:text-sm text-white focus:border-emerald-500 outline-none" placeholder="Tambah Misi baru (tekan Enter)..."/>
                <button onClick={() => { if(!newMission.trim()) return; setContent({...content, missions: [...content.missions, newMission]}); setNewMission(''); }} className="px-4 py-3 bg-emerald-600 rounded-xl text-white hover:bg-emerald-700 transition-colors flex items-center justify-center shrink-0"><Plus size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {content.missions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">Belum ada misi ditambahkan.</div>
                ) : (
                  content.missions.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-zinc-900/80 border border-white/5 p-3 rounded-xl gap-3 group">
                        {editingIndex === i ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input 
                              type="text" 
                              value={editText} 
                              onChange={e => setEditText(e.target.value)} 
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const updated = [...content.missions];
                                  updated[i] = editText;
                                  setContent({...content, missions: updated});
                                  setEditingIndex(null);
                                } else if (e.key === 'Escape') {
                                  setEditingIndex(null);
                                }
                              }}
                              autoFocus
                              className="w-full bg-black/60 border border-emerald-500/50 p-2 rounded-lg text-xs text-white outline-none"
                            />
                            <button onClick={() => {
                              const updated = [...content.missions];
                              updated[i] = editText;
                              setContent({...content, missions: updated});
                              setEditingIndex(null);
                            }} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Check size={14}/></button>
                            <button onClick={() => setEditingIndex(null)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white"><X size={14}/></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-slate-300 flex-1 leading-normal">{m}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => { setEditingIndex(i); setEditText(m); }} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit Misi"><Pencil size={14}/></button>
                              <button onClick={() => setContent({...content, missions: content.missions.filter((_, idx) => idx !== i)})} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Hapus Misi"><Trash2 size={14}/></button>
                            </div>
                          </>
                        )}
                    </div>
                  ))
                )}
            </div>
          </div>
      </div>
    </div>
  );
}

