import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { DEFAULT_STRUKTUR } from '../data/localDatabase';
import { Award, ShieldCheck, Users, Star, Briefcase, Target } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';

interface Member { id:string; name:string; role:string; category:string; level:number; photo_url:string; sort_order:number; }
const avatarFor=(name:string)=>`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=256`;

export default function StrukturOrganisasiPublic(){
  const [members,setMembers]=useState<Member[]>(()=>{
    try{const cached=localStorage.getItem('cached_organizational_structure')||localStorage.getItem('structure_local_v3');if(cached){const parsed=JSON.parse(cached);if(Array.isArray(parsed)&&parsed.length>0)return parsed as Member[];}}catch(_){ }
    return DEFAULT_STRUKTUR as Member[];
  });
  const [loading]=useState(false);
  const [selectedMember,setSelectedMember]=useState<Member|null>(null);

  useEffect(()=>{
    let active=true;
    const fetchMembers=async()=>{
      try{
        const {data,error}=await supabase.from('organizational_structure').select('*').order('sort_order',{ascending:true});
        if(!active)return;
        if(!error&&data&&data.length>0){setMembers(data as Member[]);try{localStorage.setItem('cached_organizational_structure',JSON.stringify(data));}catch(_){}}
      }catch(err){console.error('Struktur organisasi fetch error:',err);}
    };
    fetchMembers();
    const handleUpdate=()=>fetchMembers();
    window.addEventListener('app_data_changed',handleUpdate);
    window.addEventListener('table_updated_organizational_structure',handleUpdate);
    const channel=supabase.channel('public_structure_realtime').on('postgres_changes',{event:'*',schema:'public',table:'organizational_structure'},fetchMembers).subscribe();
    return()=>{active=false;window.removeEventListener('app_data_changed',handleUpdate);window.removeEventListener('table_updated_organizational_structure',handleUpdate);supabase.removeChannel(channel);};
  },[]);

  // Preload every Supabase photo immediately; no IntersectionObserver or shimmer is used here.
  useEffect(()=>{members.forEach(m=>{if(m.photo_url){const img=new Image();img.decoding='async';img.src=m.photo_url;}});},[members]);

  const groupedFields=useMemo(()=>{
    const fields:Record<string,Member[]>={};
    members.filter(m=>m.level===7).forEach(m=>{
      const role=(m.role||'').toLowerCase();let fieldName='Lainnya';
      if(role.includes('humas'))fieldName='Bidang Humas';else if(role.includes('pertandingan')||role.includes('wasit'))fieldName='Bidang Pertandingan';else if(role.includes('sarana')||role.includes('prasarana'))fieldName='Bidang Sarpras';else if(role.includes('prestasi')||role.includes('binpres'))fieldName='Bidang Pembinaan Prestasi';else if(role.includes('pendanaan')||role.includes('usaha'))fieldName='Bidang Dana & Usaha';else if(role.includes('organisasi'))fieldName='Bidang Organisasi';else if(role.includes('umum'))fieldName='Bidang Umum';else if(role.includes('kesehatan')||role.includes('medis'))fieldName='Bidang Kesehatan';
      if(!fields[fieldName])fields[fieldName]=[];fields[fieldName].push(m);
    });return fields;
  },[members]);

  const MemberPhoto=({member}:{member:Member})=>{
    const fallback=avatarFor(member.name);
    return <img src={member.photo_url||fallback} alt={member.name} loading="eager" decoding="sync" fetchPriority="high" referrerPolicy="no-referrer" onError={e=>{if(e.currentTarget.src!==fallback)e.currentTarget.src=fallback;}} className="w-full h-full object-cover"/>;
  };

  const MemberCard=({m,size='md'}:{m:Member,size?:'lg'|'md'})=>(
    <motion.div initial={false} animate={{opacity:1,y:0,scale:1}} whileHover={{scale:1.02}} whileTap={{scale:.99}} onClick={()=>setSelectedMember(m)} className={`bg-white rounded-[1.2rem] sm:rounded-[2.5rem] shadow-xl border border-blue-50/50 flex flex-col items-center p-3 sm:p-6 md:p-8 transition-shadow duration-300 w-[150px] sm:w-64 md:w-72 ${size==='lg'?'w-[200px] sm:w-80':''} cursor-pointer`}>
      <div className={`w-20 h-20 sm:w-28 sm:h-28 ${size==='lg'?'md:w-36 md:h-36':''} rounded-[1.5rem] sm:rounded-[2.2rem] overflow-hidden mb-4 sm:mb-6 bg-slate-100 border-[4px] sm:border-[6px] border-white shadow-inner`}><MemberPhoto member={m}/></div>
      <h3 className="text-slate-900 font-black italic uppercase text-center leading-tight tracking-tighter mb-1.5 sm:mb-3 text-[10px] sm:text-[13px] md:text-[15px]" style={{fontSize:size==='lg'?'14px':undefined}}>{m.name}</h3>
      <div className="bg-amber-500 px-2 py-0.5 sm:px-5 sm:py-2 rounded-full shadow-lg shadow-amber-500/20"><span className="text-white font-black uppercase tracking-[0.05em] text-[6px] sm:text-[9px]">{m.role}</span></div>
    </motion.div>
  );

  if(loading)return null;
  return <div className="w-full bg-[#FBFCFE] p-8 md:p-16"><div className="max-w-6xl mx-auto">
    <div className="text-center mb-20"><h1 className="text-3xl sm:text-5xl font-black text-slate-900 italic uppercase tracking-tighter mb-4">Struktur <span className="text-blue-600">Organisasi</span></h1><div className="w-24 h-1.5 bg-blue-600 mx-auto rounded-full mb-8"/></div>
    <LayoutGroup><div className="relative flex flex-col items-center">
      <div className="relative z-10 flex flex-col items-center mb-12 w-full"><div className="bg-amber-500 text-white py-1 px-4 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg mb-6 flex items-center gap-2"><ShieldCheck size={12}/>Penanggung Jawab</div><div className="flex justify-center flex-wrap gap-2">{members.filter(m=>m.level===1).map(m=><MemberCard key={m.id} m={m} size="lg"/>)}</div></div>
      {[
        {lvl:2,icon:Award,label:'Jajaran Penasehat',color:'bg-blue-600'},
        {lvl:3,icon:Star,label:'Jajaran Pembina',color:'bg-indigo-600'},
        {lvl:4,icon:Target,label:'Ketua Umum',color:'bg-emerald-600',size:'lg' as const},
        {lvl:5,icon:Briefcase,label:'Pengurus Inti',color:'bg-slate-800'},
        {lvl:6,icon:Users,label:'Kepala Pelatih',color:'bg-orange-600'}
      ].map(section=>{const filtered=members.filter(m=>m.level===section.lvl);if(!filtered.length)return null;return <div key={section.lvl} className="relative z-10 flex flex-col items-center mb-8 w-full"><div className="h-8 w-[2px] bg-slate-200 -mt-8 mb-4"/><div className={`${section.color} text-white py-0.5 px-3 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm mb-4`}>{section.label}</div><div className="flex flex-wrap justify-center gap-2">{filtered.map(m=><MemberCard key={m.id} m={m} size={section.size}/>)}</div></div>;})}
      {Object.keys(groupedFields).length>0&&<div className="relative z-10 flex flex-col items-center w-full"><div className="h-8 w-[2px] bg-slate-200 -mt-8 mb-4"/><div className="bg-slate-500 text-white py-1 px-4 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg mb-8">Koordinator & Anggota</div><div className="space-y-8 w-full flex flex-col items-center">{Object.entries(groupedFields).map(([fieldName,fieldMembers])=>{const coordinator=fieldMembers.find(m=>(m.role||'').toLowerCase().includes('koordinator'));const staffs=fieldMembers.filter(m=>!(m.role||'').toLowerCase().includes('koordinator'));return <div key={fieldName} className="flex flex-col items-center w-full"><div className="h-4 w-[2px] bg-slate-200 mb-2"/><div className="bg-white px-4 py-1 rounded-full border border-slate-200 shadow-sm mb-4"><h2 className="text-blue-600 font-black italic uppercase text-[8px] tracking-[0.1em]">{fieldName}</h2></div>{coordinator&&<div className="mb-4"><MemberCard m={coordinator}/></div>}<div className="flex flex-wrap justify-center gap-2 px-2 max-w-6xl">{staffs.map(m=><div key={m.id} onClick={()=>setSelectedMember(m)} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 w-full sm:w-60 cursor-pointer hover:bg-slate-50 transition-colors"><div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-white shadow-sm shrink-0"><MemberPhoto member={m}/></div><div className="flex flex-col min-w-0"><h4 className="font-black text-slate-900 text-[8px] uppercase italic leading-tight truncate">{m.name}</h4><p className="text-blue-600 font-bold text-[6px] uppercase tracking-widest">{m.role}</p></div></div>)}</div></div>;})}</div></div>}
    </div></LayoutGroup>
    {selectedMember&&<motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} onClick={()=>setSelectedMember(null)}><motion.div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-xs flex flex-col items-center" initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()}><div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 mb-4 shadow-inner"><MemberPhoto member={selectedMember}/></div><h2 className="text-slate-900 font-black italic uppercase text-center text-xl mb-1">{selectedMember.name}</h2><div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full mb-4">{selectedMember.role}</div><p className="text-slate-600 text-sm text-center">Informasi lebih lanjut tentang {selectedMember.name} akan ditampilkan di sini.</p><button onClick={()=>setSelectedMember(null)} className="mt-6 w-full py-2 bg-slate-100 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors">Tutup</button></motion.div></motion.div>}
  </div></div>;
}
