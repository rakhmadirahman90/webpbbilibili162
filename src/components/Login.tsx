import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, ArrowLeft, CheckCircle2, Home, Loader2, ShieldCheck, Smartphone, Wifi, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MemberRecord { id: string; nama: string; whatsapp?: string; kategori?: string; kategori_atlet?: string; jenis_kelamin?: string; domisili?: string; pengalaman?: string; foto_url?: string; email?: string; tanggal_lahir?: string; sektor_bermain?: string; ukuran_jersey?: string; created_at?: string; }

const parseLogo = (value: any) => { try { const v = typeof value === 'string' ? JSON.parse(value) : value; return v?.logo_url || ''; } catch { return ''; } };

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
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

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('62')) return digits;
    if (digits.startsWith('0')) return '62' + digits.slice(1);
    return digits;
  };

  const maskPhone = (raw: string) => {
    const d = normalizePhone(raw);
    if (d.length < 7) return raw;
    return '+' + d.slice(0,2) + ' ' + d.slice(2,5) + '••••' + d.slice(-3);
  };

  const finalizeSession = (user: any) => {
    localStorage.setItem('local_admin_session', JSON.stringify({
      user: {
        id: user.id,
        email: user.email || ((user.nama || user.full_name || 'anggota').toLowerCase().replace(/[^a-z0-9]/g,'') + '@pbbilibili162.com'),
        user_metadata: user
      }
    }));
    sessionStorage.setItem('just_logged_in','true');
    window.dispatchEvent(new Event('local-session-changed'));
    window.location.replace('/admin');
  };

  const callLogin = async (action?: string) => {
    const { data, error } = await supabase.functions.invoke('password-login', {
      body: {
        phone: normalizePhone(phone),
        password,
        ...(action ? { action, new_password: newPassword } : {})
      }
    });
    if (error) {
      const detail = await error.context?.json?.().catch?.(() => null);
      throw new Error(detail?.message || error.message || 'Layanan login tidak tersedia.');
    }
    return data;
  };

  const handleLogin = async () => {
    if (loading) return;
    const normalized = normalizePhone(phone);
    if (!/^62\d{9,13}$/.test(normalized)) {
      setErrorMsg('Masukkan nomor WhatsApp yang terdaftar, contoh: 081234567890.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Masukkan password yang telah ditentukan.');
      return;
    }
    setLoading(true); setErrorMsg(null); setSuccessMsg(null);
    try {
      const result = await callLogin();
      if (!result?.ok || !result.user) {
        setErrorMsg(result?.message || 'Nomor WhatsApp atau password tidak sesuai.');
        return;
      }
      if (result.must_change_password) {
        setMustChangePassword(true);
        setSuccessMsg('Login pertama berhasil. Silakan buat password pribadi baru sebelum masuk ke portal.');
        return;
      }
      setSuccessMsg('Login berhasil. Membuka portal…');
      finalizeSession(result.user);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Koneksi ke layanan login sedang bermasalah.');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (loading) return;
    if (newPassword.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak sama.');
      return;
    }
    if (newPassword === password) {
      setErrorMsg('Password baru harus berbeda dari password default.');
      return;
    }
    setLoading(true); setErrorMsg(null); setSuccessMsg(null);
    try {
      const result = await callLogin('change_password');
      if (!result?.ok) {
        setErrorMsg(result?.message || 'Gagal mengganti password.');
        return;
      }
      setSuccessMsg('Password berhasil diperbarui. Membuka portal…');
      finalizeSession(result.user);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Koneksi ke layanan login sedang bermasalah.');
    } finally { setLoading(false); }
  };

  const inputClass = 'h-[48px] sm:h-[50px] w-full sm:h-[54px] rounded-[16px] sm:rounded-[16px] sm:rounded-[18px] border border-blue-200/10 bg-[#081a31]/85 px-4 text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-500 focus:border-blue-400/70 focus:bg-[#0a2342] focus:ring-4 focus:ring-blue-500/10';

  return (
    <div className="relative min-h-[100svh] w-full overflow-x-hidden bg-[#020817] font-sans text-white selection:bg-blue-500/30">
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

      <main className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[560px] flex-col overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(3.15rem+env(safe-area-inset-top))] sm:px-5 sm:pt-20">
        {/* Compact mobile status bar */}
        <div className="mb-0.5 flex items-center justify-between px-1 text-[8px] font-black uppercase tracking-[.2em] text-blue-200/50 sm:text-[9px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]"/> PB162 ONLINE</span>
          <span className="inline-flex items-center gap-1.5"><Wifi size={10}/> SECURE CONNECTION</span>
        </div>

        {/* Brand / hero */}
        <header className="relative mb-1.5 text-center">
          <div className="relative mx-auto flex h-[66px] w-[66px] max-[380px]:h-[58px] max-[380px]:w-[58px] items-center justify-center rounded-[22px] sm:rounded-[28px] border border-blue-300/30 bg-gradient-to-br from-[#0d2b55] via-[#061a35] to-[#030d1d] p-2 sm:p-3 shadow-[0_0_45px_rgba(37,99,235,.24)]">
            <div className="absolute inset-1 rounded-[17px] sm:inset-1.5 sm:rounded-[22px] border border-white/[0.06]" />
            <div className="absolute -inset-1.5 rounded-[26px] sm:inset-2 sm:rounded-[32px] border border-blue-400/10" />
            <img src={logoUrl} alt="Logo PB Bilibili 162" className="relative h-full w-full object-contain" onError={(e)=>{e.currentTarget.src='/logo_pb_bilibili_162.svg';}}/>
          </div>
          <h1 className="mt-2.5 text-[24px] font-black max-[380px]:text-[24px] italic tracking-[-.045em] leading-none sm:text-4xl">PB BILIBILI <span className="text-blue-400">162</span></h1>
          <p className="mt-1 text-[6px] sm:mt-2 sm:text-[8px] font-black uppercase tracking-[.36em] text-slate-400 sm:text-[10px]">Professional Badminton Club</p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[6px] font-bold uppercase tracking-[.16em] sm:text-[9px] sm:tracking-[.28em] text-blue-200/65">
            <span>Satu Semangat</span><span className="h-1 w-1 rounded-full bg-blue-400"/><span>Satu Keluarga</span><span className="h-1 w-1 rounded-full bg-blue-400"/><span>Satu Prestasi</span>
          </div>
        </header>

        {/* Glass login panel */}
        <section className="relative overflow-hidden rounded-[24px] border border-blue-300/20 bg-[#06162b]/95 p-4 shadow-[0_24px_90px_rgba(0,0,0,.48),0_0_60px_rgba(37,99,235,.08)] backdrop-blur-2xl sm:rounded-[34px] sm:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-3 text-center sm:mb-5">
              <div className="mx-auto mb-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/10 text-blue-300 shadow-[0_0_24px_rgba(37,99,235,.14)]">
                <ShieldCheck size={18}/>
              </div>
              <h2 className="text-[22px] sm:text-[23px] font-black sm:text-[25px] tracking-[-.035em] max-[380px]:text-[22px]">Selamat Datang</h2>
              <p className="mt-0.5 text-[10px] sm:mt-1 sm:text-xs leading-5 text-slate-400">Masuk untuk mengakses sistem<br className="sm:hidden"/> PB Bilibili 162</p>
            </div>

            {errorMsg && <div role="alert" className="mb-3 flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3.5"><AlertCircle size={17} className="mt-0.5 shrink-0 text-red-400"/><div className="min-w-0"><p className="text-xs font-extrabold text-red-300">Akses Ditolak</p><p className="mt-0.5 break-words text-[11px] leading-5 text-red-200/70">{errorMsg}</p></div></div>}
            {successMsg && <div role="status" className="mb-3 flex gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3.5"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400"/><p className="text-[11px] leading-5 text-emerald-200/80">{successMsg}</p></div>}

  {!mustChangePassword ? (
  <form onSubmit={e=>{e.preventDefault();handleLogin();}} className="space-y-3">
    <label className="mb-1 ml-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-blue-100/60 sm:text-[9px]"><Smartphone size={13} className="text-blue-400"/> Nomor WhatsApp Terdaftar</label>
    <div className="relative">
      <input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={e=>{setErrorMsg(null);setPhone(e.target.value.replace(/[^0-9+ ]/g,''));}} className={inputClass + ' pr-12 text-[15px] font-semibold sm:text-base'} placeholder="08xxxxxxxxxx"/>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-wider text-emerald-400/70">WA</span>
    </div>
    <label className="mb-1 ml-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-blue-100/60 sm:text-[9px]"><LockKeyhole size={13} className="text-cyan-300"/> Password</label>
    <input type="password" autoComplete="current-password" required value={password} onChange={e=>{setErrorMsg(null);setPassword(e.target.value);}} className={inputClass + ' text-[15px] font-semibold sm:text-base'} placeholder="Masukkan password"/>
    <div className="rounded-2xl border border-blue-300/10 bg-blue-500/[.04] p-3 text-[9px] leading-4 text-slate-400">
      <p>Default password anggota: <strong className="text-blue-300">12345678</strong>. Setelah login pertama wajib diganti.</p>
    </div>
    <button type="submit" disabled={loading} className="group relative flex h-[50px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[18px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-xs font-black uppercase tracking-[.12em] text-white shadow-[0_14px_36px_rgba(0,102,255,.28)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
      {loading ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}<span>{loading ? 'Memproses…' : 'Masuk ke Sistem'}</span>
    </button>
  </form>
  ) : (
  <form onSubmit={e=>{e.preventDefault();handleChangePassword();}} className="space-y-3">
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.07] p-4">
      <p className="text-sm font-black text-amber-200">Ganti Password Pertama Kali</p>
      <p className="mt-1 text-[10px] leading-4 text-amber-100/70">Demi keamanan, password default wajib diganti sebelum mengakses portal.</p>
    </div>
    <label className="mb-1 ml-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-blue-100/60 sm:text-[9px]"><LockKeyhole size={13} className="text-cyan-300"/> Password Baru</label>
    <input type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e=>{setErrorMsg(null);setNewPassword(e.target.value);}} className={inputClass + ' text-[15px] font-semibold sm:text-base'} placeholder="Minimal 8 karakter"/>
    <label className="mb-1 ml-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-blue-100/60 sm:text-[9px]"><LockKeyhole size={13} className="text-cyan-300"/> Konfirmasi Password Baru</label>
    <input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>{setErrorMsg(null);setConfirmPassword(e.target.value);}} className={inputClass + ' text-[15px] font-semibold sm:text-base'} placeholder="Ulangi password baru"/>
    <button type="submit" disabled={loading} className="group relative flex h-[50px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[18px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-xs font-black uppercase tracking-[.12em] text-white shadow-[0_14px_36px_rgba(0,102,255,.28)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
      {loading ? <Loader2 size={18} className="animate-spin"/> : <LockKeyhole size={18}/>}<span>{loading ? 'Menyimpan…' : 'Simpan Password Baru'}</span>
    </button>
  </form>
  )}

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-slate-500"><ShieldCheck size={11} className="text-blue-400"/> Nomor WhatsApp + Password • koneksi aman</div>
          </div>
        </section>

        <footer className="mt-3 hidden px-2 text-center sm:mt-5 sm:block">
          <div className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[.24em] text-slate-600"><span className="h-px w-8 bg-white/[.08]"/><span>More Than A Club</span><span className="h-px w-8 bg-white/[.08]"/></div>
          <p className="mt-1.5 text-[7px] sm:mt-2 sm:text-[8px] uppercase tracking-[.2em] text-slate-700">Community • Discipline • Teamwork • Achievement</p>
          <button type="button" onClick={()=>navigate('/')} className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2.5 text-[10px] font-black text-slate-400 backdrop-blur-xl transition hover:border-blue-400/30 hover:text-white"><ArrowLeft size={13}/> Kembali ke Beranda</button>
        </footer>
      </main>
    </div>
  );
}
