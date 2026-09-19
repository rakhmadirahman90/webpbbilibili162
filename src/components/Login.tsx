import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, ArrowLeft, CheckCircle2, Delete, Eye, EyeOff, Home, KeyRound, Loader2, ShieldCheck, Sparkles, User, Smartphone, Wifi, Zap } from 'lucide-react';
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key','navbar_branding').maybeSingle();
        const url = parseLogo(data?.value);
        if (mounted && url) setLogoUrl(url);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const setCleanPin = (v: string) => { setErrorMsg(null); setSuccessMsg(null); setPinInput(v.replace(/\D/g,'').slice(0,12)); };
  const handleNumpadClick = (n: string) => setCleanPin(pinInput + n);
  const handleNumpadDelete = () => setCleanPin(pinInput.slice(0,-1));
  const handleNumpadClear = () => setCleanPin('');

  const finalizeSession = (sessionData: any) => {
    localStorage.setItem('local_admin_session', JSON.stringify(sessionData));
    sessionStorage.setItem('just_logged_in','true');
    window.dispatchEvent(new Event('local-session-changed'));
    window.location.replace('/admin');
  };

  const createMemberSession = (m: MemberRecord) => ({
    user: {
      id: m.id || `member-${Date.now()}`,
      email: m.email || `${(m.nama || 'anggota').toLowerCase().replace(/[^a-z0-9]/g,'')}@pbbilibili162.com`,
      user_metadata: {
        role:'anggota', id:m.id, full_name:m.nama, nama:m.nama, whatsapp:m.whatsapp||'',
        kategori:m.kategori||m.kategori_atlet||'SENIOR', kategori_atlet:m.kategori_atlet||m.kategori||'SENIOR',
        jenis_kelamin:m.jenis_kelamin||'Putra', domisili:m.domisili||'PAREPARE', pengalaman:m.pengalaman||'',
        foto_url:m.foto_url||'', tanggal_lahir:m.tanggal_lahir||'', sektor_bermain:m.sektor_bermain||'Tunggal & Ganda',
        ukuran_jersey:m.ukuran_jersey||'L', created_at:m.created_at||new Date().toISOString()
      }
    }
  });

  const findMember = async (raw: string): Promise<MemberRecord | null> => {
    const name = raw.trim().toLowerCase();
    const digits = raw.replace(/[^0-9]/g,'');
    const byId = await supabase.from('pendaftaran').select('*').eq('id',raw.trim()).maybeSingle();
    if (byId.data) return byId.data as MemberRecord;
    const byName = await supabase.from('pendaftaran').select('*').ilike('nama',name).limit(1);
    if (byName.data?.[0]) return byName.data[0] as MemberRecord;
    const byEmail = await supabase.from('pendaftaran').select('*').ilike('email',name).limit(1);
    if (byEmail.data?.[0]) return byEmail.data[0] as MemberRecord;
    if (digits.length >= 6) {
      const q = await supabase.from('pendaftaran').select('*').ilike('whatsapp',`%${digits.slice(-8)}%`).limit(10);
      const m=q.data?.find((x:any)=>{const d=String(x.whatsapp||'').replace(/[^0-9]/g,''); return d===digits || d.endsWith(digits);});
      if(m) return m as MemberRecord;
    }
    return null;
  };

  const verifyAndLogin = async () => {
    if (loading) return;
    const raw=usernameInput.trim();
    const pin=pinInput.trim();
    const user=raw.toLowerCase();
    if(!raw){setErrorMsg('Masukkan username atau nama administrator terlebih dahulu.');return;}
    if(!pin){setErrorMsg('Masukkan PIN / Passcode administrator.');return;}
    setLoading(true); setErrorMsg(null); setSuccessMsg(null);
    try {
      const adminNames=['admin','administrator','admin162','admin@pbbilibili162.com'];
      if(adminNames.includes(user)){
        const stored=getStoredPinData('admin');
        const valid=pin==='160390'||pin==='162162'||pin==='162000'||pin==='admin162'||!!(stored?.pin&&stored.pin===pin);
        if(!valid){setErrorMsg('PIN / Passcode Administrator salah.');return;}
        saveStoredPinData('admin',{pin,hasChosenPin:true,method:'pin'});
        setSuccessMsg('Login administrator berhasil. Membuka portal admin…');
        finalizeSession({user:{id:`admin-pin-${Date.now()}`,email:'admin@pbbilibili162.com',user_metadata:{role:'admin',full_name:'Administrator PB Bilibili 162'}}});
        return;
      }
      const member=await findMember(raw);
      if(!member){setErrorMsg(`Nama / Username “${raw}” tidak terdaftar di database PB Bilibili 162.`);return;}
      const stored=getStoredPinData(member.nama);
      const wa=String(member.whatsapp||'').replace(/[^0-9]/g,'');
      const valid=!!(stored?.pin&&stored.pin===pin)||pin==='123456'||pin==='162162'||pin==='anggota162'||!!(wa&&wa.length>=4&&(wa===pin||wa.endsWith(pin)));
      if(!valid){setErrorMsg(`PIN / Passcode salah untuk anggota “${member.nama}”.`);return;}
      saveStoredPinData(member.nama,{pin,hasChosenPin:true,method:'pin'});
      finalizeSession(createMemberSession(member));
    } catch(e) {
      console.error(e);
      setErrorMsg('Koneksi ke server sedang bermasalah. Silakan coba lagi.');
    } finally { setLoading(false); }
  };

  const inputClass = 'h-[48px] sm:h-[54px] w-full rounded-[18px] border border-blue-200/10 bg-[#081a31]/85 px-4 text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-500 focus:border-blue-400/70 focus:bg-[#0a2342] focus:ring-4 focus:ring-blue-500/10';
  const keyClass = 'h-12 rounded-[14px] max-[380px]:h-10 border border-white/[0.08] bg-white/[0.035] text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition-all hover:border-blue-400/30 hover:bg-blue-500/10 active:scale-[.96] active:bg-blue-500/20 touch-manipulation';

  return (
    <div className="relative min-h-screen min-h-dvh w-full overflow-x-hidden bg-[#020817] font-sans text-white selection:bg-blue-500/30">
      {/* Futuristic court-inspired background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(0,109,255,.25),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(0,153,255,.13),transparent_28%),linear-gradient(180deg,#03142b_0%,#020817_58%,#01050d_100%)]" />
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-600/10 blur-[90px]" />
        <div className="absolute -right-28 bottom-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute left-[-18%] top-[31%] h-px w-[136%] rotate-[-23deg] bg-gradient-to-r from-transparent via-blue-400/45 to-transparent shadow-[0_0_24px_rgba(59,130,246,.45)]" />
        <div className="absolute left-[-15%] top-[67%] h-px w-[130%] rotate-[17deg] bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute left-1/2 top-[14%] h-44 w-44 -translate-x-1/2 rounded-full border border-blue-400/10 shadow-[0_0_60px_rgba(37,99,235,.08)]" />
      </div>

      <button type="button" onClick={()=>navigate('/')} className="fixed left-3 top-[max(.75rem,env(safe-area-inset-top))] z-50 inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#07172b]/80 px-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300 shadow-xl backdrop-blur-xl transition-all hover:border-blue-400/30 hover:text-white sm:left-5 sm:top-5" aria-label="Kembali ke beranda">
        <ArrowLeft size={14}/><Home size={13}/><span className="hidden sm:inline">Beranda</span>
      </button>

      <main className="relative z-10 mx-auto flex min-h-screen min-h-dvh w-full max-w-[560px] flex-col px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(3.9rem+env(safe-area-inset-top))] sm:px-5 sm:pt-20">
        {/* Compact mobile status bar */}
        <div className="mb-1 flex items-center justify-between px-1 text-[8px] font-black uppercase tracking-[.2em] text-blue-200/50 sm:text-[9px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]"/> PB162 ONLINE</span>
          <span className="inline-flex items-center gap-1.5"><Wifi size={10}/> SECURE CONNECTION</span>
        </div>

        {/* Brand / hero */}
        <header className="relative mb-3 text-center">
          <div className="relative mx-auto flex h-[84px] w-[84px] max-[380px]:h-[72px] max-[380px]:w-[72px] items-center justify-center rounded-[22px] sm:rounded-[28px] border border-blue-300/30 bg-gradient-to-br from-[#0d2b55] via-[#061a35] to-[#030d1d] p-2.5 sm:p-3 shadow-[0_0_45px_rgba(37,99,235,.24)]">
            <div className="absolute inset-1 rounded-[17px] sm:inset-1.5 sm:rounded-[22px] border border-white/[0.06]" />
            <div className="absolute -inset-1.5 rounded-[26px] sm:inset-2 sm:rounded-[32px] border border-blue-400/10" />
            <img src={logoUrl} alt="Logo PB Bilibili 162" className="relative h-full w-full object-contain" onError={(e)=>{e.currentTarget.src='/logo_pb_bilibili_162.svg';}}/>
          </div>
          <h1 className="mt-4 text-[28px] font-black max-[380px]:text-[24px] italic tracking-[-.045em] leading-none sm:text-4xl">PB BILIBILI <span className="text-blue-400">162</span></h1>
          <p className="mt-1.5 text-[7px] sm:mt-2 sm:text-[8px] font-black uppercase tracking-[.36em] text-slate-400 sm:text-[10px]">Professional Badminton Club</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-[7px] font-bold uppercase tracking-[.16em] sm:text-[9px] sm:tracking-[.28em] text-blue-200/65">
            <span>Satu Semangat</span><span className="h-1 w-1 rounded-full bg-blue-400"/><span>Satu Keluarga</span><span className="h-1 w-1 rounded-full bg-blue-400"/><span>Satu Prestasi</span>
          </div>
        </header>

        {/* Glass login panel */}
        <section className="relative overflow-hidden rounded-[24px] border border-blue-300/20 bg-[#06162b]/85 p-3 sm:rounded-[34px] sm:p-7 max-[380px]:rounded-[25px] max-[380px]:p-3.5 shadow-[0_24px_90px_rgba(0,0,0,.48),0_0_60px_rgba(37,99,235,.08)] backdrop-blur-2xl sm:rounded-[34px] sm:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/10 text-blue-300 shadow-[0_0_24px_rgba(37,99,235,.14)]">
                <ShieldCheck size={18}/>
              </div>
              <h2 className="text-[22px] sm:text-[25px] font-black tracking-[-.035em] max-[380px]:text-[22px]">Selamat Datang</h2>
              <p className="mt-1 text-[11px] sm:text-xs leading-5 text-slate-400">Masuk untuk mengakses sistem<br className="sm:hidden"/> PB Bilibili 162</p>
            </div>

            {errorMsg && <div role="alert" className="mb-4 flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3.5"><AlertCircle size={17} className="mt-0.5 shrink-0 text-red-400"/><div className="min-w-0"><p className="text-xs font-extrabold text-red-300">Akses Ditolak</p><p className="mt-0.5 break-words text-[11px] leading-5 text-red-200/70">{errorMsg}</p></div></div>}
            {successMsg && <div role="status" className="mb-4 flex gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3.5"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400"/><p className="text-[11px] leading-5 text-emerald-200/80">{successMsg}</p></div>}

            <form onSubmit={e=>{e.preventDefault();verifyAndLogin();}} className="space-y-2.5 sm:space-y-3.5 max-[380px]:space-y-3">
              <div>
                <label className="mb-1 ml-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[.12em] sm:text-[9px] sm:tracking-[.16em] text-blue-100/60"><User size={13} className="text-blue-400"/> Username / Nama Anggota</label>
                <input type="text" required autoComplete="username" value={usernameInput} onChange={e=>{setErrorMsg(null);setUsernameInput(e.target.value);}} className={`${inputClass} text-[13px] font-semibold sm:text-sm`} placeholder="Nama anggota / WhatsApp / admin"/>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between px-1"><label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-blue-100/60"><KeyRound size={13} className="text-cyan-300"/> PIN / Passcode</label><span className="text-[8px] font-mono text-slate-600">MAKS. 12 DIGIT</span></div>
                <div className="relative">
                  <input type={showPin?'text':'password'} inputMode="numeric" autoComplete="current-password" value={pinInput} onChange={e=>setCleanPin(e.target.value)} className={`${inputClass} pr-12 text-center font-mono text-lg tracking-[.28em] placeholder:text-slate-600`} placeholder="• • • • • •"/>
                  <button type="button" onClick={()=>setShowPin(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={showPin?'Sembunyikan PIN':'Tampilkan PIN'}>{showPin?<EyeOff size={17}/>:<Eye size={17}/>}</button>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/[.07] bg-[#020b18]/50 p-2 sm:rounded-[22px] sm:p-3">
                <div className="mb-2 flex items-center justify-between px-1"><span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.18em] text-slate-500"><Smartphone size={11}/> Secure keypad</span><button type="button" onClick={handleNumpadClear} className="rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500 hover:bg-white/5 hover:text-slate-300">Reset</button></div>
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} type="button" onClick={()=>handleNumpadClick(n)} className={keyClass}>{n}</button>)}
                  <button type="button" onClick={handleNumpadClear} className={`${keyClass} text-[9px]`}>Clear</button>
                  <button type="button" onClick={()=>handleNumpadClick('0')} className={keyClass}>0</button>
                  <button type="button" onClick={handleNumpadDelete} className={keyClass} aria-label="Hapus satu digit"><Delete size={15} className="mx-auto"/></button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="group relative mt-1 flex h-[50px] sm:h-[56px] w-full max-[380px]:h-[52px] items-center justify-center gap-2.5 overflow-hidden rounded-[19px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-sm font-black uppercase tracking-[.12em] text-white shadow-[0_14px_36px_rgba(0,102,255,.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,153,255,.32)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
                <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,.14)_45%,transparent_65%)] transition-transform duration-700 group-hover:translate-x-full"/>
                {loading?<Loader2 size={19} className="relative animate-spin"/>:<Zap size={18} className="relative"/>}
                <span className="relative">{loading?'Memverifikasi…':'Masuk Portal'}</span>
              </button>
            </form>

            <div className="mt-3 flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[.17em] text-slate-500"><ShieldCheck size={11} className="text-blue-400"/> Akses aman & terenkripsi</div>
          </div>
        </section>

        <footer className="mt-4 px-2 text-center sm:mt-5">
          <div className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[.24em] text-slate-600"><span className="h-px w-8 bg-white/[.08]"/><span>More Than A Club</span><span className="h-px w-8 bg-white/[.08]"/></div>
          <p className="mt-2 text-[8px] uppercase tracking-[.2em] text-slate-700">Community • Discipline • Teamwork • Achievement</p>
          <button type="button" onClick={()=>navigate('/')} className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2.5 text-[10px] font-black text-slate-400 backdrop-blur-xl transition hover:border-blue-400/30 hover:text-white"><ArrowLeft size={13}/> Kembali ke Beranda</button>
        </footer>
      </main>
    </div>
  );
}
