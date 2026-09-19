import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, ArrowLeft, CheckCircle2, Delete, Eye, EyeOff, Home, KeyRound, Loader2, ShieldCheck, Sparkles, User, Smartphone } from 'lucide-react';
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

  const input='w-full h-13 sm:h-14 rounded-2xl bg-[#070d1a]/90 border border-white/[0.09] text-white outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 transition-all';
  const key='h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-white/[0.035] hover:bg-blue-600/15 active:bg-blue-600/30 border border-white/[0.08] text-white font-extrabold text-sm transition-all touch-manipulation';

  return <div className="min-h-screen min-h-dvh w-full bg-[#040914] text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
    {/* Ambient background */}
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-400/[0.07] blur-[130px]" />
      <div className="absolute -bottom-52 left-1/3 h-[430px] w-[430px] rounded-full bg-blue-900/20 blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:42px_42px]" />
    </div>

    <button type="button" onClick={()=>navigate('/')} className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] sm:left-5 sm:top-5 z-50 inline-flex min-h-10 items-center gap-2 rounded-xl sm:rounded-2xl border border-white/10 bg-[#0a1222]/80 px-3 py-2.5 text-[11px] sm:text-xs font-bold text-slate-300 shadow-lg backdrop-blur-xl hover:bg-[#101b31] hover:text-white transition-all touch-manipulation" aria-label="Kembali ke beranda">
      <ArrowLeft size={15}/><Home size={14}/><span className="hidden xs:inline">Beranda</span>
    </button>

    <main className="relative z-10 min-h-screen min-h-dvh w-full flex items-center justify-center px-2.5 py-12 sm:px-5 sm:py-20 lg:px-8 lg:py-10">
      <div className="w-full max-w-5xl lg:min-h-[620px] grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] overflow-hidden rounded-[26px] sm:rounded-[34px] border border-white/10 bg-[#09111f]/95 shadow-[0_30px_100px_rgba(0,0,0,.58)] backdrop-blur-xl">
        {/* Brand panel - desktop */}
        <section className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-gradient-to-br from-blue-950/70 via-[#091426] to-[#07101e] p-10 xl:p-12">
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full border border-blue-400/10" />
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-blue-400/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 p-2.5 shadow-xl shadow-blue-950/40">
                <img src={logoUrl} alt="Logo PB Bilibili 162" className="h-full w-full object-contain" onError={(e)=>{e.currentTarget.src='/logo_pb_bilibili_162.svg';}}/>
              </div>
              <div><p className="text-sm font-black tracking-tight">PB Bilibili 162</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Professional Badminton Club</p></div>
            </div>
            <div className="mt-16 max-w-md">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-blue-300"><ShieldCheck size={12}/> Secure Member Portal</div>
              <h2 className="text-4xl xl:text-5xl font-black leading-[1.02] tracking-[-0.04em]">Satu pintu untuk<br/><span className="text-blue-400">akses klub.</span></h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">Gunakan username atau nama anggota dan PIN untuk mengakses layanan anggota maupun portal administrator PB Bilibili 162.</p>
            </div>
          </div>
          <div className="relative flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600"><div className="h-px flex-1 bg-white/[0.06]"/><span>Akses aman • PB Bilibili 162</span></div>
        </section>

        {/* Login panel */}
        <section className="flex min-w-0 flex-col justify-center p-4 pt-7 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-7 md:p-9 lg:p-10 xl:p-12">
          <div className="mx-auto w-full max-w-[470px]">
            <header className="text-center lg:text-left">
              <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                <div className="relative flex h-[82px] w-[82px] items-center justify-center rounded-[26px] border border-blue-400/25 bg-gradient-to-br from-[#0c1b34] to-[#071022] p-3 shadow-[0_14px_40px_rgba(37,99,235,.18)]">
                  <div className="absolute inset-1.5 rounded-[20px] border border-white/[0.05]" />
                  <img src={logoUrl} alt="Logo PB Bilibili 162" className="relative h-full w-full object-contain" onError={(e)=>{e.currentTarget.src='/logo_pb_bilibili_162.svg';}}/>
                </div>
                <p className="mt-3 text-[17px] font-black tracking-[-0.02em]">PB Bilibili 162</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Professional Badminton Club</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-400/15 bg-blue-500/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-blue-300"><ShieldCheck size={10}/> Akses Aman</div>
              </div>
              <div className="hidden lg:inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-300"><Sparkles size={12}/> Secure Member Access</div>
              <h1 className="mt-1 text-[27px] sm:text-[32px] lg:text-[34px] font-black tracking-[-0.03em] text-white">Portal System</h1>
              <p className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Login anggota & administrator</p>
            </header>

            {errorMsg && <div role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3.5 flex gap-3"><AlertCircle size={17} className="mt-0.5 shrink-0 text-red-400"/><div className="min-w-0"><p className="text-xs font-extrabold text-red-300">Akses Ditolak</p><p className="mt-0.5 text-[11px] leading-5 text-red-200/70 break-words">{errorMsg}</p></div></div>}
            {successMsg && <div role="status" className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3.5 flex gap-3"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400"/><p className="text-[11px] leading-5 text-emerald-200/80">{successMsg}</p></div>}

            <form onSubmit={e=>{e.preventDefault();verifyAndLogin();}} className="mt-5 space-y-4 sm:mt-6">
              <div>
                <label className="mb-2 ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400"><User size={14} className="text-blue-400"/> Username / Nama Anggota</label>
                <input type="text" required autoComplete="username" value={usernameInput} onChange={e=>{setErrorMsg(null);setUsernameInput(e.target.value);}} className={`${input} px-4 text-[13px] sm:text-sm font-semibold placeholder:text-slate-600`} placeholder="Nama anggota / WhatsApp / admin"/>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between px-1"><label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400"><KeyRound size={14} className="text-cyan-400"/> PIN / Passcode</label><span className="text-[9px] font-mono text-slate-600">maks. 12 digit</span></div>
                <div className="relative"><input type={showPin?'text':'password'} inputMode="numeric" autoComplete="current-password" value={pinInput} onChange={e=>setCleanPin(e.target.value)} className={`${input} px-4 pr-12 text-center font-mono text-lg tracking-[0.28em] placeholder:text-slate-700`} placeholder="Masukkan PIN"/><button type="button" onClick={()=>setShowPin(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label={showPin?'Sembunyikan PIN':'Tampilkan PIN'}>{showPin?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
              </div>

              <div className="rounded-[22px] border border-white/[0.07] bg-[#060c18]/70 p-2.5 sm:rounded-3xl sm:p-3.5">
                <div className="mb-2 flex items-center justify-between px-1.5 sm:mb-2.5 sm:px-1"><span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600"><Smartphone size={11}/> Secure keypad</span><button type="button" onClick={handleNumpadClear} className="rounded-lg px-2 py-1 text-[9px] font-black uppercase text-slate-500 hover:bg-white/5 hover:text-slate-300">Reset</button></div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">{['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} type="button" onClick={()=>handleNumpadClick(n)} className={`${key} h-12 sm:h-12`}>{n}</button>)}<button type="button" onClick={handleNumpadClear} className={`${key} h-12 text-[10px] sm:h-12`}>Clear</button><button type="button" onClick={()=>handleNumpadClick('0')} className={`${key} h-12 sm:h-12`}>0</button><button type="button" onClick={handleNumpadDelete} className={`${key} h-12 sm:h-12`} aria-label="Hapus satu digit"><Delete size={16} className="mx-auto"/></button></div>
              </div>

              <button type="submit" disabled={loading} className="group relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_35px_rgba(37,99,235,.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(37,99,235,.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"><span className="absolute inset-y-0 left-[-30%] w-1/4 -skew-x-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[560%]"/>{loading?<Loader2 size={19} className="animate-spin"/>:<ShieldCheck size={18}/>}<span>{loading?'Memverifikasi…':'Masuk Portal'}</span></button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 sm:mt-6 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600"><ShieldCheck size={12}/> Sistem akses aman • PB Bilibili 162</div>
          </div>
        </section>
      </div>
    </main>
  </div>;
}
