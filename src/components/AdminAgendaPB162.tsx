import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock3, ImagePlus, MapPin, Pencil, Plus, Radio, Save, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type AgendaItem = { id:string; title:string; description:string|null; event_date:string; start_time:string|null; end_time:string|null; location:string|null; category:string|null; status:string|null; is_published:boolean; image_url?:string|null; image_position?:string|null; image_zoom?:number|null; image_rotation?:number|null };
type FormState = Omit<AgendaItem,'id'>;
const empty:FormState={title:'',description:'',event_date:'',start_time:'',end_time:'',location:'',category:'Kegiatan Klub',status:'Terjadwal',is_published:true,image_url:'',image_position:'50% 50%',image_zoom:100,image_rotation:0};

export default function AdminAgendaPB162(){
 const cropRef=useRef<HTMLDivElement|null>(null); const gestureRef=useRef<any>(null); const [imageUploading,setImageUploading]=useState(false); const [items,setItems]=useState<AgendaItem[]>([]); const [form,setForm]=useState<FormState>(empty); const [editing,setEditing]=useState<string|null>(null); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [live,setLive]=useState(false);
 const load=useCallback(async()=>{const {data,error}=await supabase.from('agenda_pb162').select('*').order('created_at',{ascending:false}).order('event_date',{ascending:false}).order('start_time',{ascending:false});if(!error)setItems((data||[]) as AgendaItem[]);setLoading(false)},[]);
 useEffect(()=>{void load();const ch=supabase.channel(`agenda-admin-${Date.now()}`).on('postgres_changes',{event:'*',schema:'public',table:'agenda_pb162'},p=>{const row=(p.new||p.old) as AgendaItem;setItems(cur=>{if(p.eventType==='DELETE')return cur.filter(x=>x.id!==row.id);const next=cur.some(x=>x.id===row.id)?cur.map(x=>x.id===row.id?row:x):[row,...cur];return next})}).subscribe(s=>setLive(s==='SUBSCRIBED'));return()=>{supabase.removeChannel(ch)}},[load]);
 const edit=(x:AgendaItem)=>{setEditing(x.id);setForm({...x});window.scrollTo({top:0,behavior:'smooth'})};
 const uploadAgendaImage=async(file:File)=>{setImageUploading(true);try{const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`agenda/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error}=await supabase.storage.from('gallery').upload(path,file,{contentType:file.type});if(error)throw error;const {data}=supabase.storage.from('gallery').getPublicUrl(path);setForm(f=>({...f,image_url:data.publicUrl,image_position:'50% 50%',image_zoom:100,image_rotation:0}))}catch(err:any){await Swal.fire({icon:'error',title:'Gagal mengunggah gambar',text:err?.message||'Upload gambar gagal.',background:'#0f172a',color:'#fff'})}finally{setImageUploading(false)}};
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!form.title.trim()||!form.event_date){await Swal.fire({icon:'warning',title:'Data belum lengkap',text:'Judul dan tanggal agenda wajib diisi.',background:'#0f172a',color:'#fff'});return}setSaving(true);const payload={...form,title:form.title.trim(),description:form.description?.trim()||null,start_time:form.start_time||null,end_time:form.end_time||null,location:form.location?.trim()||null};const result=editing?await supabase.from('agenda_pb162').update(payload).eq('id',editing):await supabase.from('agenda_pb162').insert(payload);setSaving(false);if(result.error){await Swal.fire({icon:'error',title:'Gagal menyimpan',text:result.error.message,background:'#0f172a',color:'#fff'});return}setForm(empty);setEditing(null);await load();await Swal.fire({icon:'success',title:'Agenda tersimpan',timer:1000,showConfirmButton:false,background:'#0f172a',color:'#fff'})};
 const remove=async(id:string)=>{const ok=await Swal.fire({icon:'warning',title:'Hapus agenda?',text:'Data agenda akan dihapus.',showCancelButton:true,confirmButtonText:'Hapus',cancelButtonText:'Batal',background:'#0f172a',color:'#fff'});if(!ok.isConfirmed)return;const {error}=await supabase.from('agenda_pb162').delete().eq('id',id);if(error)await Swal.fire({icon:'error',title:'Gagal menghapus',text:error.message,background:'#0f172a',color:'#fff'});else await load()};
 const set=(k:keyof FormState,v:any)=>setForm(f=>({...f,[k]:v}));
 return <div className="w-full p-3 sm:p-5 md:p-8 text-slate-200"><div className="max-w-6xl mx-auto space-y-5">
  <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 to-[#0b1224] p-5 sm:p-7"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300"><CalendarDays size={15}/> Agenda PB Bilibili 162</div><h1 className="mt-2 text-2xl sm:text-3xl font-black italic uppercase text-white">Kelola Agenda <span className="text-blue-500">Realtime</span></h1><p className="mt-2 text-xs sm:text-sm text-slate-400">Setiap perubahan langsung diteruskan ke halaman publik.</p></div><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-black uppercase ${live?'border-emerald-500/30 bg-emerald-500/10 text-emerald-300':'border-slate-700 bg-slate-900 text-slate-400'}`}><Radio size={13} className={live?'animate-pulse':''}/>{live?'Realtime terhubung':'Menghubungkan...'}</span></div></header>
  <form onSubmit={save} className="rounded-3xl border border-white/10 bg-[#0b1224] p-4 sm:p-6 shadow-xl overflow-hidden">
    <div className="flex items-start justify-between gap-3 mb-5">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">Manajemen Agenda</p>
        <h2 className="mt-1 text-lg sm:text-xl font-black uppercase italic text-white">{editing?'Edit Agenda':'Tambah Agenda'}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Isi data kegiatan dengan lengkap. Tampilan formulir otomatis menyesuaikan ukuran layar.</p>
      </div>
      {editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty)}} className="shrink-0 p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700" aria-label="Batal edit"><X size={17}/></button>}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-300">Thumbnail Kegiatan</div><p className="mt-1 text-[10px] text-slate-500">Upload lalu edit langsung pada foto.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase text-white"><ImagePlus size={14}/>{imageUploading?'Mengunggah...':'Pilih Gambar'}<input type="file" accept="image/*" className="hidden" disabled={imageUploading} onChange={e=>{const f=e.target.files?.[0];if(f)void uploadAgendaImage(f);e.currentTarget.value=''}}/></label></div>{form.image_url?<><div ref={cropRef} className="relative aspect-video overflow-hidden rounded-xl border border-blue-400/30 bg-black select-none cursor-grab active:cursor-grabbing" style={{touchAction:'none',WebkitUserSelect:'none'}}
 onTouchStart={e=>{e.preventDefault();const t=[...e.touches];const g:any={basePosition:form.image_position||'50% 50%',baseZoom:form.image_zoom||100,baseRotation:form.image_rotation||0};if(t.length===1){g.x=t[0].clientX;g.y=t[0].clientY}else if(t.length>=2){const a=t[0],b=t[1];g.dist=Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)||1;g.angle=Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI;g.midX=(a.clientX+b.clientX)/2;g.midY=(a.clientY+b.clientY)/2}gestureRef.current=g}}
 onTouchMove={e=>{e.preventDefault();const g=gestureRef.current;if(!g)return;const t=[...e.touches];const el=e.currentTarget;const p=(g.basePosition||'50% 50%').split(' ');const px=Number.parseFloat(p[0])||50,py=Number.parseFloat(p[1])||50;if(t.length===1&&g.x!=null){const dx=t[0].clientX-g.x,dy=t[0].clientY-g.y;setForm(v=>({...v,image_position:(Math.max(0,Math.min(100,px+dx/el.clientWidth*100))).toFixed(1)+'% '+(Math.max(0,Math.min(100,py+dy/el.clientHeight*100))).toFixed(1)+'%'}))}else if(t.length>=2&&g.dist){const a=t[0],b=t[1];const dist=Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)||1;const angle=Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI;const mx=(a.clientX+b.clientX)/2,my=(a.clientY+b.clientY)/2;setForm(v=>({...v,image_position:(Math.max(0,Math.min(100,px+(mx-g.midX)/el.clientWidth*100))).toFixed(1)+'% '+(Math.max(0,Math.min(100,py+(my-g.midY)/el.clientHeight*100))).toFixed(1)+'%',image_zoom:Math.max(100,Math.min(300,g.baseZoom*dist/g.dist)),image_rotation:Math.round(g.baseRotation+(angle-g.angle))}))}}}
 onTouchEnd={e=>{if(e.touches.length===0){gestureRef.current=null;return}const t=e.touches[0];gestureRef.current={basePosition:form.image_position||'50% 50%',baseZoom:form.image_zoom||100,baseRotation:form.image_rotation||0,x:t.clientX,y:t.clientY}}}
 onMouseDown={e=>{e.preventDefault();gestureRef.current={mouse:true,x:e.clientX,y:e.clientY,basePosition:form.image_position||'50% 50%'}}}
 onMouseMove={e=>{const g=gestureRef.current;if(!g?.mouse||e.buttons!==1)return;e.preventDefault();const p=(g.basePosition||'50% 50%').split(' '),px=Number.parseFloat(p[0])||50,py=Number.parseFloat(p[1])||50;setForm(v=>({...v,image_position:(Math.max(0,Math.min(100,px+(e.clientX-g.x)/e.currentTarget.clientWidth*100))).toFixed(1)+'% '+(Math.max(0,Math.min(100,py+(e.clientY-g.y)/e.currentTarget.clientHeight*100))).toFixed(1)+'%'}))}}
 onMouseUp={()=>{gestureRef.current=null}} onMouseLeave={()=>{if(gestureRef.current?.mouse)gestureRef.current=null}}
 onWheel={e=>{e.preventDefault();setForm(v=>({...v,image_zoom:Math.max(100,Math.min(300,(v.image_zoom||100)+(e.deltaY<0?8:-8)))}))}}
 onDoubleClick={()=>setForm(v=>({...v,image_position:'50% 50%',image_zoom:100,image_rotation:0}))}>
 <img src={form.image_url} alt="Atur foto agenda" draggable={false} className="absolute inset-0 h-full w-full pointer-events-none object-cover will-change-transform" style={{transform:(()=>{const p=(form.image_position||'50% 50%').split(' ');const x=Number.parseFloat(p[0])||50,y=Number.parseFloat(p[1])||50;return `translate3d(${x-50}%, ${y-50}%, 0) scale(${(form.image_zoom||100)/100}) rotate(${form.image_rotation||0}deg)`})(),transformOrigin:'center center'}}/>
 <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/3 top-0 h-full border-l border-white/15"/><div className="absolute left-2/3 top-0 h-full border-l border-white/15"/><div className="absolute left-0 top-1/3 w-full border-t border-white/15"/><div className="absolute left-0 top-2/3 w-full border-t border-white/15"/></div>
</div></>:<div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-600"><ImagePlus size={32}/></div>}</div>
      <label className="block min-w-0 md:col-span-2 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Judul Agenda <span className="text-rose-400">*</span></span>
        <input required value={form.title} onChange={e=>set('title',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" placeholder="Contoh: Latihan Rutin PB Bilibili 162"/>
      </label>

      <label className="block min-w-0 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Tanggal <span className="text-rose-400">*</span></span>
        <input required type="date" value={form.event_date} onChange={e=>set('event_date',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"/>
      </label>

      <label className="block min-w-0 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Kategori</span>
        <input value={form.category||''} onChange={e=>set('category',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" placeholder="Kegiatan Klub"/>
      </label>

      <label className="block min-w-0 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Mulai</span>
        <input type="time" value={form.start_time||''} onChange={e=>set('start_time',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"/>
      </label>

      <label className="block min-w-0 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Selesai</span>
        <input type="time" value={form.end_time||''} onChange={e=>set('end_time',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"/>
      </label>

      <label className="block min-w-0 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Lokasi</span>
        <input value={form.location||''} onChange={e=>set('location',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" placeholder="Contoh: GOR Tonrangeng"/>
      </label>

      <label className="block min-w-0 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Status</span>
        <select value={form.status||'Terjadwal'} onChange={e=>set('status',e.target.value)} className="block w-full min-w-0 h-12 rounded-xl border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15">
          <option>Terjadwal</option><option>Berlangsung</option><option>Selesai</option><option>Dibatalkan</option>
        </select>
      </label>

      <label className="block min-w-0 md:col-span-2 text-[11px] font-bold text-slate-300">
        <span className="block mb-1.5">Keterangan</span>
        <textarea value={form.description||''} onChange={e=>set('description',e.target.value)} rows={4} className="block w-full min-w-0 resize-y rounded-xl border border-white/10 bg-slate-950 px-3.5 py-3 text-sm leading-relaxed text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" placeholder="Informasi tambahan tentang agenda..."/>
      </label>

      <label className="md:col-span-2 flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-3 text-[11px] font-bold text-slate-300">
        <input type="checkbox" checked={form.is_published} onChange={e=>set('is_published',e.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600"/>
        <span><span className="text-white">Tampilkan kepada publik</span><span className="block mt-0.5 text-[9px] font-medium text-slate-500">Agenda akan terlihat pada halaman publik jika diaktifkan.</span></span>
      </label>
    </div>

    <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
      {editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty)}} className="order-2 sm:order-1 inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-5 py-3 text-xs font-black uppercase text-slate-200 hover:bg-slate-700">Batal</button>}
      <button type="submit" disabled={saving} className="order-1 sm:order-2 inline-flex min-h-12 w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-600/15 hover:bg-blue-500 disabled:opacity-60">
        {editing?<Save size={16}/>:<Plus size={16}/>} {saving?'Menyimpan...':editing?'Simpan Perubahan':'Tambah Agenda'}
      </button>
    </div>
  </form>
  <section className="rounded-3xl border border-white/10 bg-[#0b1224] overflow-hidden"><div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between"><h2 className="font-black uppercase italic text-white">Daftar Agenda</h2><span className="text-[10px] font-bold text-slate-500">{items.length} agenda</span></div>{loading?<div className="p-8 text-center text-sm text-slate-500">Memuat...</div>:!items.length?<div className="p-8 text-center text-sm text-slate-500">Belum ada agenda.</div>:<div className="divide-y divide-white/10">{items.map(x=><div key={x.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4"><div className="flex-1 min-w-0"><div className="flex flex-wrap gap-2"><span className="text-[9px] font-black uppercase text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-1">{x.category||'Kegiatan Klub'}</span><span className="text-[9px] font-black uppercase text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1">{x.is_published?'Publik':'Draft'}</span></div><h3 className="mt-2 font-black text-white uppercase">{x.title}</h3><div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span className="flex items-center gap-1.5"><CalendarDays size={13} className="text-blue-400"/>{x.event_date}</span>{x.start_time&&<span className="flex items-center gap-1.5"><Clock3 size={13} className="text-amber-400"/>{x.start_time.slice(0,5)}{x.end_time?`–${x.end_time.slice(0,5)}`:''}</span>}{x.location&&<span className="flex items-center gap-1.5"><MapPin size={13} className="text-rose-400"/>{x.location}</span>}</div></div><div className="flex gap-2"><button onClick={()=>edit(x)} className="min-h-10 px-3 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-bold"><Pencil size={14} className="inline mr-1"/>Edit</button><button onClick={()=>remove(x.id)} className="min-h-10 px-3 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-bold"><Trash2 size={14} className="inline mr-1"/>Hapus</button></div></div>)}</div>}</section>
 </div></div>
}
