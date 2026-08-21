import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { FileText, Plus, Trash2, Search, Loader2, UploadCloud, Eye, X, Edit3, Save } from 'lucide-react';

export default function ManajemenDokumen({ session }: { session?: any }) {
  const role = session?.user?.user_metadata?.role || 'admin';
  const isAdmin = role === 'admin';
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); setDocs([]); } else setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchDocs();
    const channel = supabase.channel('admin_documents_realtime_v2').on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, fetchDocs).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const notify = (icon: 'success'|'error', titleText: string, text?: string) => Swal.fire({ icon, title: titleText, text, background: '#0F172A', color: '#fff', confirmButtonColor: '#2563EB' });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !title.trim()) { if (!title.trim()) void notify('error', 'Judul dokumen wajib diisi'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `docs/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('assets').getPublicUrl(path);
      const { error: insertError } = await supabase.from('documents').insert({ title: title.trim(), description: description.trim(), file_url: publicData.publicUrl, file_type: ext.toUpperCase(), file_size: file.size });
      if (insertError) throw insertError;
      setTitle(''); setDescription(''); e.target.value = '';
      await fetchDocs();
      await notify('success', 'Dokumen berhasil disimpan ke Supabase');
    } catch (err: any) { console.error(err); await notify('error', 'Gagal menyimpan dokumen', err?.message || 'Periksa hak akses Supabase.'); }
    finally { setUploading(false); }
  };

  const saveEdit = async () => {
    if (!editingId || !title.trim()) return;
    const { error } = await supabase.from('documents').update({ title: title.trim(), description: description.trim() }).eq('id', editingId);
    if (error) return void notify('error', 'Gagal memperbarui dokumen', error.message);
    setEditingId(null); setTitle(''); setDescription(''); await fetchDocs(); await notify('success', 'Dokumen diperbarui');
  };

  const startEdit = (doc: any) => { setEditingId(doc.id); setTitle(doc.title || ''); setDescription(doc.description || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const deleteDoc = async (doc: any) => {
    const result = await Swal.fire({ title: 'Hapus dokumen?', text: 'Data akan dihapus dari tabel Supabase.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal', confirmButtonColor: '#EF4444', background: '#0F172A', color: '#fff' });
    if (!result.isConfirmed) return;
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) return void notify('error', 'Gagal menghapus dokumen', error.message);
    try { const marker = '/storage/v1/object/public/assets/'; const idx = String(doc.file_url || '').indexOf(marker); if (idx >= 0) await supabase.storage.from('assets').remove([String(doc.file_url).slice(idx + marker.length)]); } catch {}
    await fetchDocs(); await notify('success', 'Dokumen dihapus dari Supabase');
  };

  const filtered = docs.filter(d => `${d.title || ''} ${d.description || ''}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="p-4 md:p-8 bg-[#070d1a] min-h-screen text-white">
    {previewUrl && <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/90"><div className="relative w-full max-w-5xl h-[90dvh] bg-zinc-900 rounded-2xl overflow-hidden"><button onClick={() => setPreviewUrl(null)} className="absolute top-3 right-3 z-10 p-2 bg-black/60 rounded-full"><X/></button><iframe src={previewUrl} className="w-full h-full border-none" title="Preview"/></div></div>}
    <div className="max-w-6xl mx-auto"><h1 className="text-2xl md:text-4xl font-black italic uppercase flex items-center gap-3"><FileText className="text-blue-500"/>Manajemen <span className="text-blue-500">Dokumen</span></h1><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[.25em] mt-2">Sumber data tunggal: public.documents — Supabase</p></div>
    <div className="max-w-6xl mx-auto mt-8 grid lg:grid-cols-3 gap-6">
      <div className="bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 h-fit">
        {isAdmin && <><h2 className="font-black uppercase italic mb-4 flex items-center gap-2">{editingId ? <Edit3 size={18}/> : <Plus size={18}/>} {editingId ? 'Edit Dokumen' : 'Tambah Dokumen'}</h2><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul Dokumen" className="w-full bg-black border border-zinc-800 p-3 rounded-xl mb-3 text-sm"/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Keterangan" className="w-full bg-black border border-zinc-800 p-3 rounded-xl mb-3 text-sm h-24 resize-none"/>{editingId ? <div className="flex gap-2"><button onClick={saveEdit} className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Save size={15}/>Simpan</button><button onClick={()=>{setEditingId(null);setTitle('');setDescription('')}} className="p-3 bg-zinc-800 rounded-xl"><X size={16}/></button></div> : <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-blue-500">{uploading?<Loader2 className="animate-spin text-blue-500"/>:<UploadCloud className="text-zinc-500"/>}<span className="text-[10px] font-black uppercase">{uploading?'Mengunggah...':'Pilih File'}</span><input type="file" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={uploading} onChange={handleUpload}/></label>}</>}
      </div>
      <div className="lg:col-span-2"><div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari arsip..." className="w-full bg-zinc-900 border border-zinc-800 py-3 pl-10 rounded-xl text-sm"/></div>{loading?<div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>:<div className="space-y-3">{filtered.map(doc=><div key={doc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="flex items-start gap-3"><FileText className="text-blue-500 shrink-0"/><div className="min-w-0 flex-1"><h3 className="font-bold truncate">{doc.title}</h3><p className="text-xs text-zinc-500 mt-1">{doc.description || 'Tanpa keterangan'}</p><p className="text-[9px] text-zinc-600 mt-2">{doc.file_type || 'FILE'} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID') : ''}</p></div></div><div className="flex gap-2 mt-3"><button onClick={()=>setPreviewUrl(doc.file_url)} className="flex-1 bg-zinc-800 py-2 rounded-lg text-xs font-bold flex justify-center gap-1"><Eye size={14}/>View</button><a href={doc.file_url} download className="flex-1 bg-blue-600 py-2 rounded-lg text-xs font-bold text-center">Download</a>{isAdmin&&<><button onClick={()=>startEdit(doc)} className="p-2 bg-amber-600 rounded-lg"><Edit3 size={14}/></button><button onClick={()=>void deleteDoc(doc)} className="p-2 bg-red-600 rounded-lg"><Trash2 size={14}/></button></>}</div></div>)}</div>}</div>
    </div>
  </div>;
}
