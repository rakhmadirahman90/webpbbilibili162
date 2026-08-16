import React, { useEffect, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from './supabase';
import Swal from 'sweetalert2';
import { Registrant } from './types';
import AthleteProfileModal from './components/AthleteProfileModal';
import { motion } from 'framer-motion';
import { Search, User, X, Award, TrendingUp, Users, MapPin, Phone, ShieldCheck, Star, Trophy, Save, Loader2, Edit3, ChevronLeft, ChevronRight, Zap, Sparkles, RefreshCcw, Camera, Scissors, Plus, Upload } from 'lucide-react';

const createImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => { const image = new Image(); image.addEventListener('load', () => resolve(image)); image.addEventListener('error', reject); image.setAttribute('crossOrigin', 'anonymous'); image.src = url; });
const formatNumber = (val: number | string | undefined | null) => { if (val === undefined || val === null || val === '') return ''; if (val === 0) return ''; const numberString = val.toString().replace(/[^0-9]/g, ''); return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
const parseNumber = (str: string) => { const clean = str.replace(/[^0-9]/g, ''); return clean ? parseInt(clean) : 0; };

export default function ManajemenAtlet() {
  const [atlets, setAtlets] = useState<Registrant[]>([]); const [loading, setLoading] = useState(true); const [searchTerm, setSearchTerm] = useState(''); const [selectedAtlet, setSelectedAtlet] = useState<Registrant | null>(null); const [currentPage, setCurrentPage] = useState(1); const itemsPerPage = 8;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); const [editingStats, setEditingStats] = useState<Partial<Registrant> | null>(null); const [isSaving, setIsSaving] = useState(false); const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); const [newAtlet, setNewAtlet] = useState({ nama:'', whatsapp:'', kategori:'SENIOR', domisili:'', seed:'UNSEEDED', points:0, bio:'Atlet PB Bilibili 162', prestasi:'Regular Player', foto_url:'' });
  const [imageToCrop, setImageToCrop] = useState<string | null>(null); const [crop, setCrop] = useState({x:0,y:0}); const [zoom, setZoom] = useState(1); const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null); const [isCropping, setIsCropping] = useState(false); const [uploadingImage, setUploadingImage] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); const [notifMessage, setNotifMessage] = useState(''); const BUCKET_NAME='atlet_photos';

  useEffect(() => { void fetchAtlets(); const channel = supabase.channel('manajemen_atlet_realtime').on('postgres_changes',{event:'*',schema:'public',table:'pendaftaran'},()=>void fetchAtlets()).on('postgres_changes',{event:'*',schema:'public',table:'atlet_stats'},()=>void fetchAtlets()).on('postgres_changes',{event:'*',schema:'public',table:'rankings'},()=>void fetchAtlets()).subscribe(); return ()=>{ void supabase.removeChannel(channel); }; }, []);
  useEffect(()=>{setCurrentPage(1)},[searchTerm]);

  const fetchAtlets = async () => {
    setLoading(true);
    try {
      // IMPORTANT: this screen must bypass the Local-First IndexedDB proxy.
      // Production Supabase contains the authoritative athlete records.
      const db:any=(globalThis as any).__PB_REMOTE_SUPABASE;
      if(!db){ throw new Error('Remote Supabase client belum siap'); }
      const timeout=<T,>(promise:Promise<T>,ms:number)=>Promise.race([promise,new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error('Supabase timeout')),ms))]);
      const [p,r,s]=await Promise.allSettled([
        timeout(db.from('pendaftaran').select('*').order('nama',{ascending:true}),8000),
        timeout(db.from('rankings').select('*').order('total_points',{ascending:false}),8000),
        timeout(db.from('atlet_stats').select('pendaftaran_id, points, total_points, seed'),8000)
      ]);
      const pendaftaran:any[]=p.status==='fulfilled'&&p.value?.data? p.value.data:[];
      const rankings:any[]=r.status==='fulfilled'&&r.value?.data? r.value.data:[];
      const stats:any[]=s.status==='fulfilled'&&s.value?.data? s.value.data:[];
      console.log('[ManajemenAtlet] Supabase counts',{pendaftaran:pendaftaran.length,rankings:rankings.length,stats:stats.length});
      const statsMap=new Map(stats.map((x:any)=>[x.pendaftaran_id,x]));
      const formatted=pendaftaran.map((atlet:any)=>{
        const rankingMatch=rankings.find((x:any)=>(x.pendaftaran_id&&x.pendaftaran_id===atlet.id)||((x.player_name||x.nama||'').trim().toLowerCase()===(atlet.nama||'').trim().toLowerCase()));
        const stat:any=statsMap.get(atlet.id); const base=Number(stat?.points||0); const added=Number(stat?.total_points||0);
        return {...atlet,points:stat?base+added:Number(rankingMatch?.total_points||0),raw_base_points:base,raw_added_points:added,rank:rankingMatch?rankings.indexOf(rankingMatch)+1:0,seed:stat?.seed||rankingMatch?.seed||'UNSEEDED',foto_url:atlet.foto_url||rankingMatch?.photo_url||'',bio:rankingMatch?.bio||'No biography available.',prestasi:rankingMatch?.achievement||'Regular Player'};
      });
      if(formatted.length>0) setAtlets(formatted); else if(rankings.length>0) setAtlets(rankings.map((x:any,i)=>({id:x.pendaftaran_id||x.id||`r-${i}`,nama:x.player_name||x.nama||'Atlet',kategori_atlet:x.category||'SENIOR',points:Number(x.total_points||x.poin||0),raw_base_points:Number(x.poin||0),raw_added_points:Number(x.bonus||0),rank:i+1,seed:x.seed||'UNSEEDED',foto_url:x.photo_url||'',bio:x.bio||'No biography available.',prestasi:x.achievement||'Regular Player'}))); else setAtlets([]);
    } catch(err:any) { console.error('[ManajemenAtlet] fetch error',err); setAtlets([]); } finally { setLoading(false); }
  };

  const handleSeedChange=(seed:string,isEditing=false)=>{const cfg:any={A:{base:10000,age:'SENIOR'},'B+':{base:8500,age:'SENIOR'},'B-':{base:7000,age:'SENIOR'},C:{base:5500,age:'MUDA'},UNSEEDED:{base:0,age:'SENIOR'}}; const c=cfg[seed]||cfg.UNSEEDED; if(isEditing)setEditingStats(v=>({...v,seed,points:c.base,kategori:c.age})); else setNewAtlet(v=>({...v,seed,points:c.base,kategori:c.age}));};
  const onFileChange=async(e:React.ChangeEvent<HTMLInputElement>)=>{if(e.target.files?.length){const reader=new FileReader();reader.readAsDataURL(e.target.files[0]);reader.onload=()=>{setImageToCrop(reader.result as string);setIsCropping(true)}}};
  const onCropComplete=useCallback((_a:any,p:any)=>setCroppedAreaPixels(p),[]);
  const handleUploadCroppedImage=async()=>{if(!imageToCrop||!croppedAreaPixels)return;setUploadingImage(true);try{const image=await createImage(imageToCrop);const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');canvas.width=croppedAreaPixels.width;canvas.height=croppedAreaPixels.height;ctx?.drawImage(image,croppedAreaPixels.x,croppedAreaPixels.y,croppedAreaPixels.width,croppedAreaPixels.height,0,0,croppedAreaPixels.width,croppedAreaPixels.height);const blob=await new Promise<Blob>(resolve=>canvas.toBlob(b=>resolve(b!), 'image/jpeg',.8));const fileName=`atlet-${Date.now()}-${(newAtlet.nama||'temp').replace(/\s+/g,'-').toLowerCase()}.jpg`;const {error}=await supabase.storage.from(BUCKET_NAME).upload(fileName,blob);if(error)throw error;const {data:{publicUrl}}=supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);setNewAtlet(v=>({...v,foto_url:publicUrl}));setIsCropping(false);setImageToCrop(null);setNotifMessage('Foto Berhasil Diunggah!');setShowSuccess(true);setTimeout(()=>setShowSuccess(false),3000)}catch(err:any){Swal.fire({icon:'error',title:'Upload Gagal',text:`Upload Gagal! ${err.message||''}`,confirmButtonColor:'#EF4444',background:'#0F172A',color:'#fff'})}finally{setUploadingImage(false)}};

  const handleAddNewAtlet=async(e:React.FormEvent)=>{e.preventDefault();if(isSubmitting)return;setIsSaving(true);setIsSubmitting(true);try{const cleanName=newAtlet.nama.trim();const {error:pError}=await supabase.from('pendaftaran').upsert({nama:cleanName,whatsapp:newAtlet.whatsapp,kategori:newAtlet.kategori,domisili:newAtlet.domisili,foto_url:newAtlet.foto_url,status:'verified'},{onConflict:'nama'});if(pError)throw pError;const {error:rError}=await supabase.from('rankings').upsert({player_name:cleanName,category:newAtlet.kategori,seed:newAtlet.seed,total_points:newAtlet.points,photo_url:newAtlet.foto_url,bio:newAtlet.bio,achievement:newAtlet.prestasi},{onConflict:'player_name'});if(rError)throw rError;setNotifMessage('Atlet Berhasil Ditambahkan!');setShowSuccess(true);setIsAddModalOpen(false);await fetchAtlets();setTimeout(()=>setShowSuccess(false),3000)}catch(err:any){Swal.fire({icon:'error',title:'Gagal Menyimpan',text:err.message,confirmButtonColor:'#EF4444',background:'#0F172A',color:'#fff'})}finally{setIsSaving(false);setIsSubmitting(false)}};
  const handleUpdateStats=async(e:React.FormEvent)=>{e.preventDefault();if(!editingStats?.nama||isSubmitting)return;setIsSaving(true);setIsSubmitting(true);try{await supabase.from('pendaftaran').update({kategori:editingStats.kategori}).eq('nama',editingStats.nama);const {error}=await supabase.from('rankings').upsert({player_name:editingStats.nama,category:editingStats.kategori,seed:editingStats.seed,total_points:editingStats.points},{onConflict:'player_name'});if(error)throw error;await fetchAtlets();setNotifMessage('Data Performa Diperbarui!');setShowSuccess(true);setIsEditModalOpen(false);setSelectedAtlet(null);setTimeout(()=>setShowSuccess(false),3000)}catch(err:any){Swal.fire({icon:'error',title:'Gagal Menyimpan Performa',text:err.message,confirmButtonColor:'#EF4444',background:'#0F172A',color:'#fff'})}finally{setIsSaving(false);setIsSubmitting(false)}};

  const filteredAtlets=atlets.filter(a=>a.nama?.toLowerCase().includes(searchTerm.toLowerCase())); const indexOfLastItem=currentPage*itemsPerPage; const currentItems=filteredAtlets.slice(indexOfLastItem-itemsPerPage,indexOfLastItem); const totalPages=Math.max(1,Math.ceil(filteredAtlets.length/itemsPerPage));

  // Preserve the existing UI below this point.
  return <div className="min-h-screen">{loading ? <div className="flex min-h-[420px] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600"/><div className="font-semibold tracking-[0.25em] text-slate-300">MENGAKSES SERVER...</div></div></div> : <div className="p-4"><div className="mb-6 text-4xl font-bold">MANAJEMEN <span className="text-blue-600">ATLET</span></div><button onClick={()=>setIsAddModalOpen(true)} className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-xl font-bold text-white">＋ TAMBAH ATLET</button><div className="my-5 grid grid-cols-2 rounded-2xl border bg-white p-5 text-center"><div><div className="text-slate-400">TOTAL</div><div className="text-4xl font-bold">{atlets.length}</div></div><div><div className="text-slate-400">TOP TIER</div><div className="text-4xl font-bold text-blue-600">{atlets.filter(a=>['A','B+'].includes(String((a as any).seed))).length}</div></div></div><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="CARI NAMA ATLET..." className="mb-6 w-full rounded-2xl border p-5"/><div className="space-y-3">{currentItems.map((a:any)=><button key={a.id} onClick={()=>setSelectedAtlet(a)} className="w-full rounded-2xl border bg-white p-4 text-left"><div className="font-bold">{a.nama}</div><div className="text-sm text-slate-500">{a.kategori||a.kategori_atlet||'SENIOR'} · {a.points||0} poin</div></button>)}{currentItems.length===0&&<div className="py-20 text-center text-slate-400">Tidak ada data atlet.</div>}</div><div className="mt-6 flex justify-between"><button disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}>‹</button><span>{currentPage} / {totalPages}</span><button disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)}>›</button></div></div>}</div>;
}
