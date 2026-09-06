import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, RefreshCw, Save, Settings2, ShieldCheck, Trophy, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';
import { saveSiteSetting } from '../utils/siteSettingsHelper';
import {
  AJATAPPARENG_CATEGORY,
  DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS,
  LOKAL_PAREPARE_CATEGORY,
  TournamentRegistrationSettings,
  getWitaDateString,
} from '../utils/tournamentRegistrationSettings';

const readConfig = (value: any): TournamentRegistrationSettings => {
  let v = value;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
  return {
    ...DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS,
    ...(v || {}),
    categories: { ...DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS.categories, ...(v?.categories || {}) },
  };
};

export default function AdminTurnamenPendaftaranSettings() {
  const [settings, setSettings] = useState<TournamentRegistrationSettings>(DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'tournament_registration_settings').maybeSingle();
      if (error) throw error;
      setSettings(readConfig(data?.value));
      const [a, l] = await Promise.all([
        supabase.from('pendaftaran_turnamen').select('id', { count: 'exact', head: true }).eq('kategori', AJATAPPARENG_CATEGORY).not('status_pendaftaran', 'in', '(Ditolak,rejected)'),
        supabase.from('pendaftaran_turnamen').select('id', { count: 'exact', head: true }).eq('kategori', LOKAL_PAREPARE_CATEGORY).not('status_pendaftaran', 'in', '(Ditolak,rejected)'),
      ]);
      if (a.error) throw a.error;
      if (l.error) throw l.error;
      setCounts({ ajatappareng: Number(a.count || 0), lokalParepare: Number(l.count || 0) });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal memuat pengaturan', text: e?.message || 'Periksa koneksi database.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('admin_tournament_registration_settings_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (p: any) => { if (p.new?.key === 'tournament_registration_settings') void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const today = getWitaDateString();
  const closedByDate = settings.enabled && today >= settings.cutoffDate;
  const aCount = counts.ajatappareng || 0;
  const lCount = counts.lokalParepare || 0;
  const aFull = aCount >= settings.categories.ajatappareng.target;
  const lFull = lCount >= settings.categories.lokalParepare.target;
  const allClosed = !settings.enabled || closedByDate || (aFull && lFull);

  const update = (patch: Partial<TournamentRegistrationSettings>) => setSettings(prev => ({ ...prev, ...patch }));
  const updateCategory = (key: 'ajatappareng' | 'lokalParepare', target: number) => setSettings(prev => ({ ...prev, categories: { ...prev.categories, [key]: { ...prev.categories[key], target: Math.max(1, Math.floor(Number(target) || 1)) } } }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteSetting('tournament_registration_settings', { ...settings, updated_at: new Date().toISOString() }, 'Pengaturan Pendaftaran Turnamen');
      await load();
      await Swal.fire({ icon: 'success', title: 'Pengaturan tersimpan', text: 'Batas kuota dan tanggal penutupan langsung berlaku pada formulir publik.', timer: 1800, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: e?.message || 'Perubahan tidak berhasil disimpan.' });
    } finally { setSaving(false); }
  };

  const status = useMemo(() => [
    { key: 'ajatappareng', label: AJATAPPARENG_CATEGORY, count: aCount, target: settings.categories.ajatappareng.target, full: aFull },
    { key: 'lokalParepare', label: LOKAL_PAREPARE_CATEGORY, count: lCount, target: settings.categories.lokalParepare.target, full: lFull },
  ], [aCount, lCount, aFull, lFull, settings.categories]);

  return (
    <div className="min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="overflow-hidden rounded-[28px] bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-xl sm:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-amber-200"><Trophy size={14}/> Bilibili 162 Cup I • 2026</div><h1 className="text-2xl font-black sm:text-4xl">Pengaturan Pendaftaran Turnamen</h1><p className="mt-2 max-w-3xl text-sm text-slate-300">Atur kuota otomatis per kategori dan tanggal penutupan formulir. Sistem publik akan mengikuti pengaturan ini tanpa perlu mengubah kode.</p></div>
            <button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black uppercase"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Muat ulang</button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {status.map((item) => {
            const percent = Math.min(100, Math.round((item.count / Math.max(1, item.target)) * 100));
            const remaining = Math.max(0, item.target - item.count);
            return <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Kuota Kategori</p><h2 className="mt-1 text-base font-black leading-6 text-slate-900">{item.label}</h2></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${item.full ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.full ? 'PENUH' : 'AKTIF'}</span></div><div className="mt-5 flex items-end justify-between"><div><span className="text-4xl font-black">{item.count}</span><span className="ml-1 text-slate-400">/ {item.target} pasangan</span></div><div className="text-right text-xs font-bold text-slate-500">Sisa <b className="text-slate-900">{remaining}</b></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }}/></div></div>;
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Settings2 size={20}/></div><div><h2 className="text-lg font-black">Kontrol Otomatis</h2><p className="text-xs text-slate-500">Semua perubahan tersimpan ke database dan dipakai formulir publik.</p></div></div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><span><b className="block text-sm">Pendaftaran Aktif</b><small className="text-xs text-slate-500">Matikan untuk menutup seluruh formulir sekarang.</small></span><input type="checkbox" checked={settings.enabled} onChange={e => update({ enabled: e.target.checked })} className="h-5 w-5 accent-blue-600"/></label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-sm font-black">Tanggal Tutup Otomatis</span><small className="text-xs text-slate-500">Mulai tanggal ini formulir otomatis tidak dapat diisi (WITA).</small><input type="date" value={settings.cutoffDate} onChange={e => update({ cutoffDate: e.target.value })} className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"/></label>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="rounded-2xl border border-slate-200 p-4"><span className="block text-sm font-black">Target AD/BC-/C+C Ajatappareng</span><input type="number" min="1" value={settings.categories.ajatappareng.target} onChange={e => updateCategory('ajatappareng', Number(e.target.value))} className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-lg font-black"/><small className="mt-2 block text-xs text-slate-500">Default: 64 pasangan</small></label>
            <label className="rounded-2xl border border-slate-200 p-4"><span className="block text-sm font-black">Target C Lokal Parepare</span><input type="number" min="1" value={settings.categories.lokalParepare.target} onChange={e => updateCategory('lokalParepare', Number(e.target.value))} className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-lg font-black"/><small className="mt-2 block text-xs text-slate-500">Default: 128 pasangan</small></label>
          </div>
          <label className="mt-5 block rounded-2xl border border-slate-200 p-4"><span className="block text-sm font-black">Pesan Penutupan</span><textarea value={settings.message} onChange={e => update({ message: e.target.value })} rows={3} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${allClosed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{allClosed ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>} {allClosed ? 'Pendaftaran sedang tertutup berdasarkan aturan aktif.' : 'Pendaftaran saat ini masih terbuka.'}</div><button disabled={saving} onClick={() => void save()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-black uppercase text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"><Save size={16}/>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button></div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={20}/><div><b>Aturan sistem:</b><ul className="mt-2 list-disc space-y-1 pl-5"><li>Jika kuota Ajatappareng mencapai target, hanya kategori tersebut yang otomatis ditutup.</li><li>Jika kuota Lokal Parepare mencapai target, hanya kategori tersebut yang otomatis ditutup.</li><li>Mulai <b>08 September 2026</b>, kedua kategori otomatis ditutup sesuai tanggal WITA.</li><li>Database juga memiliki pengaman server-side sehingga pendaftaran baru tidak dapat melewati kuota walaupun dua orang mendaftar bersamaan.</li></ul></div></div></section>
      </div>
    </div>
  );
}
