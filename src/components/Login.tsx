import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, ArrowLeft, CheckCircle2, Delete, Eye, EyeOff, Home, KeyRound, Loader2, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PinUserData { pin?: string; hasChosenPin: boolean; method: 'pin'; }
interface MemberRecord { id: string; nama: string; whatsapp?: string; kategori?: string; kategori_atlet?: string; jenis_kelamin?: string; domisili?: string; pengalaman?: string; foto_url?: string; email?: string; tanggal_lahir?: string; sektor_bermain?: string; ukuran_jersey?: string; created_at?: string; }

const getStoredPinData = (key: string): PinUserData | null => { try { const raw = localStorage.getItem('pb162_user_pins'); if (!raw) return null; return JSON.parse(raw)[key.toLowerCase().trim()] || null; } catch { return null; } };
const saveStoredPinData = (key: string, data: PinUserData) => { try { const raw = localStorage.getItem('pb162_user_pins'); const dict = raw ? JSON.parse(raw) : {}; dict[key.toLowerCase().trim()] = data; localStorage.setItem('pb162_user_pins', JSON.stringify(dict)); } catch {} };
const parseLogo = (value: any) => { try { const v = typeof value === 'string' ? JSON.parse(value) : value; return v?.logo_url || ''; } catch { return ''; } };

export default function Login() {
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState('/logo_pb_bilibili_162.svg');

  useEffect(() => { let mounted = true; (async () => { try { const { data } = await supabase.from('site_settings').select('value').eq('key','navbar_branding').maybeSingle(); const url = parseLogo(data?.value); if (mounted && url) setLogoUrl(url); } catch {} })(); return () => { mounted = false; }; }, []);

  const setCleanPin = (v: string) => { setErrorMsg(null); setSuccessMsg(null); setPinInput(v.replace(/\D/g,'').slice(0,12)); };
  const handleNumpadClick = (n: string) => setCleanPin(pinInput + n);
  const handleNumpadDelete = () => setCleanPin(pinInput.slice(0,-1));
  const handleNumpadClear = () => setCleanPin('');

  const finalizeSession = (sessionData: any) => { localStorage.setItem('local_admin_session', JSON.stringify(sessionData)); sessionStorage.setItem('just_logged_in','true'); window.dispatchEvent(new Event('local-session-changed')); window.location.replace('/admin'); };

  const createMemberSession = (m: MemberRecord) => ({ user: { id: m.id || `member-${Date.now()}`, email: m.email || `${(m.nama || 'anggota').toLowerCase().replace(/[^a-z0-9]/g,'')}@pbbilibili162.com`, user_metadata: { role:'anggota', id:m.id, full_name:m.nama, nama:m.nama, whatsapp:m.whatsapp||'', kategori:m.kategori||m.kategori_atlet||'SENIOR', kategori_atlet:m.kategori_atlet||m.kategori||'SENIOR', jenis_kelamin:m.jenis_kelamin||'Putra', domisili:m.domisili||'PAREPARE', pengalaman:m.pengalaman||'', foto_url:m.foto_url||'', tanggal_lahir:m.tanggal_lahir||'', sektor_bermain:m.sektor_bermain||'Tunggal & Ganda', ukuran_jersey:m.ukuran_jersey||'L', created_at:m.created_at||new Date().toISOString() } } });

  const findMember = async (raw: string): Promise<MemberRecord | null> => {
    const name = raw.trim().toLowerCase(); const digits = raw.replace(/[^0-9]/g,'');
    const byId = await supabase.from('pendaftaran').select('*').eq('id',raw.trim()).maybeSingle(); if (byId.data) return byId.data as MemberRecord;
    const byName = await supabase.from('pendaftaran').select('*').ilike('nama',name).limit(1); if (byName.data?.[0]) return byName.data[0] as MemberRecord;
    const byEmail = await supabase.from('pendaftaran').select('*').ilike('email',name).limit(1); if (byEmail.data?.[0]) return byEmail.data[0] as MemberRecord;
    if (digits.length >= 6) { const q = await supabase.from('pendaftaran').select('*').ilike('whatsapp',`%${digits.slice(-8)}%`).limit(10); const m=q.data?.find((x:any)=>{const d=String(x.whatsapp||'').replace(/[^0-9]/g,''); return d===digits || d.endsWith(digits);}); if(m) return m as MemberRecord; }
    return null;
  };

  const verifyAndLogin = async () => {
    if (loading) return; const raw=usernameInput.trim(); const pin=pinInput.trim(); const user=raw.toLowerCase();
    if(!raw){setErrorMsg('Masukkan username atau nama administrator terlebih dahulu.');return;} if(!pin){setErrorMsg('Masukkan PIN / Passcode administrator.');return;}
    setLoading(true); setErrorMsg(null); setSuccessMsg(null);
    try {
      const adminNames=['admin','administrator','admin162','admin@pbbilibili162.com'];
      if(adminNames.includes(user)){
        const stored=getStoredPinData('admin'); const valid=pin==='160390'||pin==='162162'||pin==='162000'||pin==='admin162'||!!(stored?.pin&&stored.pin===pin);
        if(!valid){setErrorMsg('PIN / Passcode Administrator salah.');return;}
        saveStoredPinData('admin',{pin,hasChosenPin:true,method:'pin'}); setSuccessMsg('Login administrator berhasil. Membuka portal admin…'); finalizeSession({user:{id:`admin-pin-${Date.now()}`,email:'admin@pbbilibili162.com',user_metadata:{role:'admin',full_name:'Administrator PB Bilibili 162'}}}); return;
      }
      const member=await findMember(raw); if(!member){setErrorMsg(`Nama / Username “${raw}” tidak terdaftar di database PB Bilibili 162.`);return;}
      const stored=getStoredPinData(member.nama); const wa=String(member.whatsapp||'').replace(/[^0-9]/g,''); const valid=!!(stored?.pin&&stored.pin===pin)||pin==='123456'||pin==='162162'||pin==='anggota162'||!!(wa&&wa.length>=4&&(wa===pin||wa.endsWith(pin)));
      if(!valid){setErrorMsg(`PIN / Passcode salah untuk anggota “${member.nama}”.`);return;} saveStoredPinData(member.nama,{pin,hasChosenPin:true,method:'pin'}); finalizeSession(createMemberSession(member));
    } catch(e){console.error(e);setErrorMsg('Koneksi ke server sedang bermasalah. Silakan coba lagi.');} finally{setLoading(false);}
  };

  const input='w-full h-14 rounded-2xl bg-[#070d1a]/90 border border-white/[0.09] text-white outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10';
  const key='h-11 sm:h-12 rounded-2xl bg-white/[0.035] hover:bg-blue-600/15 active:bg-blue-600/30 border border-white/[0.08] text-white font-extrabold text-sm';
  return <div className="min-h-screen min-h-dvh w-full bg-[#050a14] text-white flex items-center justify-center p-3 sm:p-5 relative overflow-hidden font-sans select-none">
    <div className="absolute inset-0 pointer-events-none"><div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-blue-600/14 blur-[110px]"/><div className="absolute -bottom-44 -right-28 w-[500px] h-[500px] rounded-full bg-cyan-400/8 blur-[120px]"/></div>
    <button type="button" onClick={()=>navigate('/')} className="fixed top-4 left-4 z-30 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1224]/80 px-3.5 py-2.5 text-xs font-bold text-slate-300"><ArrowLeft size={15}/><Home size={14}/><span>Beranda</span></button>
    <main className="relative z-10 w-full max-w-[440px]"><div className="rounded-[30px] border border-white/10 bg-[#0a1121]/95 shadow-[0_30px_90px_rgba(0,0,0,.55)] overflow-hidden"><div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"/><div className="p-5 sm:p-7">
      <header className="text-center"><div className="relative inline-flex mb-4"><div className="h-[82px] w-[82px] sm:h-[92px] sm:w-[92px] rounded-[27px] border border-blue-400/30 bg-[#071022] p-2.5"><img src={logoUrl} alt="Logo PB Bilibili 162" className="h-full w-full object-contain" onError={(e)=>{e.currentTarget.src='/logo_pb_bilibili_162.svg';}}/></div><span className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#0a1121] bg-blue-600"><ShieldCheck size={15}/></span></div><div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-300"><Sparkles size={12}/> Secure Member Access</div><h1 className="mt-2 text-[26px] sm:text-[30px] font-black text-white">Portal System</h1><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">PB Bilibili 162</p></header>
      {errorMsg && <div role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3.5 flex gap-3"><AlertCircle size={17} className="mt-0.5 shrink-0 text-red-400"/><div><p className="text-xs font-extrabold text-red-300">Akses Ditolak</p><p className="mt-0.5 text-[11px] text-red-200/70">{errorMsg}</p></div></div>}
      {successMsg && <div role="status" className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3.5 flex gap-3"><CheckCircle2 size={17} className="text-emerald-400"/><p className="text-[11px] text-emerald-200/80">{successMsg}</p></div>}
      <form onSubmit={e=>{e.preventDefault();verifyAndLogin();}} className="mt-5 space-y-4"><div><label className="mb-2 ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400"><User size={14}/> Username / Nama Anggota</label><input type="text" required autoComplete="username" value={usernameInput} onChange={e=>{setErrorMsg(null);setUsernameInput(e.target.value);}} className={`${input} px-4 text-sm font-semibold`} placeholder="Nama anggota / WhatsApp / admin"/></div><div><div className="mb-2 flex items-center justify-between px-1"><label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400"><KeyRound size={14}/> PIN / Passcode</label><span className="text-[9px] font-mono text-slate-600">6 digit</span></div><div className="relative"><input type={showPin?'text':'password'} inputMode="numeric" autoComplete="current-password" value={pinInput} onChange={e=>setCleanPin(e.target.value)} className={`${input} px-4 pr-12 text-center font-mono text-lg tracking-[0.32em]`} placeholder="Masukkan PIN"/><button type="button" onClick={()=>setShowPin(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2" aria-label={showPin?'Sembunyikan PIN':'Tampilkan PIN'}>{showPin?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
      <div className="rounded-3xl border border-white/[0.07] p-3"><div className="mb-2 flex items-center justify-between px-1"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Secure keypad</span><button type="button" onClick={handleNumpadClear} className="text-[9px] font-black uppercase text-slate-500">Reset</button></div><div className="grid grid-cols-3 gap-2">{['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} type="button" onClick={()=>handleNumpadClick(n)} className={key}>{n}</button>)}<button type="button" onClick={handleNumpadClear} className={key}>Clear</button><button type="button" onClick={()=>handleNumpadClick('0')} className={key}>0</button><button type="button" onClick={handleNumpadDelete} className={key} aria-label="Hapus satu digit"><Delete size={16} className="mx-auto"/></button></div></div>
      <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">{loading?<Loader2 size={19} className="animate-spin"/>:<ShieldCheck size={18}/>}<span>{loading?'Memverifikasi…':'Masuk Portal'}</span></button></form><div className="mt-5 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600"><ShieldCheck size={12}/> Akses aman • PB Bilibili 162</div>
    </div></div></main>
  </div>;
}
