import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { Search, RefreshCw, Eye, Pencil, Trash2, CheckCircle2, XCircle, Clock3, Trophy, Users, CreditCard, Filter, X, Save, ExternalLink, FileText, Image as ImageIcon, ShieldCheck } from 'lucide-react';

type Registration = {
  id: string | number;
  created_at?: string;
  kode_pendaftaran?: string;
  kategori?: string;
  nama_pemain_1?: string;
  nama_pemain_2?: string;
  whatsapp?: string;
  email?: string | null;
  asal_pb?: string;
  domisili?: string;
  biaya_pendaftaran?: number;
  status_pembayaran?: string;
  status_pendaftaran?: string;
  bukti_pembayaran_url?: string | null;
  nik_pemain_1?: string | null;
  nik_pemain_2?: string | null;
  wilayah_nik_pemain_1?: string | null;
  wilayah_nik_pemain_2?: string | null;
  foto_pemain_1_url?: string | null;
  foto_pemain_2_url?: string | null;
  ktp_pemain_1_url?: string | null;
  ktp_pemain_2_url?: string | null;
  verifikasi_nik_status?: string | null;
  verifikasi_nik_detail?: string | null;
  catatan_verifikasi?: string | null;
  [key: string]: any;
};

const clean = (v: unknown) => String(v ?? '').trim();
const statusReg = (v?: string) => {
  const s = clean(v).toLowerCase();
  if (['diterima','approved','terverifikasi','lolos'].includes(s)) return 'diterima';
  if (['ditolak','rejected'].includes(s)) return 'ditolak';
  return 'pending';
};
const statusPay = (v?: string) => {
  const s = clean(v).toLowerCase();
  return s.includes('terver') || s.includes('lunas') || s.includes('diterima') ? 'terverifikasi' : 'menunggu';
};
const rupiah = (n?: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
const dateId = (v?: string) => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

function publicOrPathUrl(value?: string | null) {
  const v = clean(value);
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return '';
}

export default function AdminPendaftaranTurnamenModern() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [registrationStatus, setRegistrationStatus] = useState('Semua');
  const [paymentStatus, setPaymentStatus] = useState('Semua');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [docsLoading, setDocsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data || []) as Registration[]);
    } catch (e: any) {
      console.error(e);
      await Swal.fire({ icon: 'error', title: 'Data pendaftaran tidak dapat dimuat', text: e?.message || 'Periksa koneksi database dan hak akses admin.', confirmButtonColor: '#2563eb' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('app_data_changed', onChange);
    window.addEventListener('table_updated_pendaftaran_turnamen', onChange);
    const channel = supabase.channel('admin_pendaftaran_turnamen_modern_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => void load()).subscribe();
    return () => {
      window.removeEventListener('app_data_changed', onChange);
      window.removeEventListener('table_updated_pendaftaran_turnamen', onChange);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter(r => {
      const hay = [r.kode_pendaftaran, r.nama_pemain_1, r.nama_pemain_2, r.whatsapp, r.email, r.asal_pb, r.domisili, r.kategori].map(clean).join(' ').toLowerCase();
      return (!q || hay.includes(q)) && (category === 'Semua' || clean(r.kategori) === category) && (registrationStatus === 'Semua' || statusReg(r.status_pendaftaran) === registrationStatus) && (paymentStatus === 'Semua' || statusPay(r.status_pembayaran) === paymentStatus);
    });
  }, [rows, query, category, registrationStatus, paymentStatus]);

  useEffect(() => setPage(1), [query, category, registrationStatus, paymentStatus]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter(r => statusReg(r.status_pendaftaran) === 'pending').length,
    accepted: rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length,
    rejected: rows.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length,
    paid: rows.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi').length
  }), [rows]);

  const getDocumentUrls = async (row: Registration) => {
    setDocsLoading(true);
    const next: Record<string, string> = {};
    const keys: Array<[keyof Registration, string]> = [
      ['foto_pemain_1_url', 'foto1'], ['ktp_pemain_1_url', 'ktp1'],
      ['foto_pemain_2_url', 'foto2'], ['ktp_pemain_2_url', 'ktp2'],
      ['bukti_pembayaran_url', 'payment']
    ];
    try {
      for (const [field, key] of keys) {
        const raw = clean(row[field]);
        if (!raw) continue;
        const direct = publicOrPathUrl(raw);
        if (direct) { next[key] = direct; continue; }
        if (field === 'bukti_pembayaran_url') continue;
        const { data, error } = await supabase.storage.from('turnamen-dokumen').createSignedUrl(raw, 60 * 60);
        if (!error && data?.signedUrl) next[key] = data.signedUrl;
      }
    } finally {
      setDocumentUrls(next);
      setDocsLoading(false);
    }
  };

  const openDetail = async (row: Registration) => {
    setSelected(row);
    setDocumentUrls({});
    await getDocumentUrls(row);
  };

  const updateStatus = async (row: Registration, nextReg: 'Diterima' | 'Ditolak') => {
    let note = '';
    if (nextReg === 'Ditolak') {
      const result = await Swal.fire({ title: 'Tolak pendaftaran?', text: `Pendaftaran ${row.kode_pendaftaran || ''} akan ditandai ditolak.`, input: 'textarea', inputPlaceholder: 'Alasan penolakan...', showCancelButton: true, confirmButtonText: 'Tolak', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
      if (!result.isConfirmed) return;
      note = clean(result.value);
    } else {
      const result = await Swal.fire({ icon: 'question', title: 'Terima pendaftaran?', text: `${clean(row.nama_pemain_1)} & ${clean(row.nama_pemain_2)}`, showCancelButton: true, confirmButtonText: 'Ya, Terima', cancelButtonText: 'Batal', confirmButtonColor: '#16a34a' });
      if (!result.isConfirmed) return;
    }
    try {
      const payload: any = { status_pendaftaran: nextReg };
      if (note) payload.catatan_verifikasi = note;
      const { error } = await supabase.from('pendaftaran_turnamen').update(payload).eq('id', row.id);
      if (error) throw error;
      await load();
      Swal.fire({ icon: 'success', title: 'Status diperbarui', timer: 1000, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memperbarui status', text: e?.message || 'Perubahan ditolak database.' }); }
  };

  const verifyPayment = async (row: Registration) => {
    const result = await Swal.fire({ icon: 'question', title: 'Verifikasi pembayaran?', html: `<b>${clean(row.nama_pemain_1)} & ${clean(row.nama_pemain_2)}</b><br>${rupiah(row.biaya_pendaftaran)}`, showCancelButton: true, confirmButtonText: 'Verifikasi', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb' });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('pendaftaran_turnamen').update({ status_pembayaran: 'Terverifikasi' }).eq('id', row.id);
      if (error) throw error;
      await load();
      Swal.fire({ icon: 'success', title: 'Pembayaran terverifikasi', timer: 1000, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memverifikasi pembayaran', text: e?.message || 'Perubahan ditolak database.' }); }
  };

  const deleteRow = async (row: Registration) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Hapus pendaftaran?', html: `<b>${clean(row.nama_pemain_1)} & ${clean(row.nama_pemain_2)}</b><br><span style="opacity:.7">${clean(row.kode_pendaftaran)}</span><br><br>Data pendaftaran akan dihapus permanen.`, showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('pendaftaran_turnamen').delete().eq('id', row.id);
      if (error) throw error;
      setSelected(null);
      await load();
      Swal.fire({ icon: 'success', title: 'Pendaftaran dihapus', timer: 1000, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: e?.message || 'Periksa hak akses admin.' }); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return; setSaving(true);
    try {
      const payload = { kategori: editing.kategori, nama_pemain_1: editing.nama_pemain_1, nama_pemain_2: editing.nama_pemain_2, whatsapp: editing.whatsapp, email: editing.email || null, asal_pb: editing.asal_pb, domisili: editing.domisili };
      const { error } = await supabase.from('pendaftaran_turnamen').update(payload).eq('id', editing.id);
      if (error) throw error;
      setEditing(null); await load();
      Swal.fire({ icon: 'success', title: 'Data peserta diperbarui', timer: 1000, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: e?.message || 'Periksa kolom database.' }); }
    finally { setSaving(false); }
  };

  const reset = () => { setQuery(''); setCategory('Semua'); setRegistrationStatus('Semua'); setPaymentStatus('Semua'); };
  const badge = (value: string, tone: 'green'|'red'|'amber'|'blue'='blue') => <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'red' ? 'bg-rose-50 text-rose-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{value}</span>;

  return (
    <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.08)]">
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-5 text-white sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-amber-200"><Trophy size={14}/> Bilibili 162 Cup I • 2026</div>
                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Pendaftaran Peserta Turnamen</h1>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">Dashboard admin untuk memeriksa pasangan, pembayaran, status pendaftaran, NIK, foto peserta, dan KTP secara lengkap.</p>
              </div>
              <button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black uppercase tracking-wide transition hover:bg-white/15"><RefreshCw size={15}/> Muat Ulang</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Total Peserta" value={stats.total} icon={<Users size={17}/>} />
            <Stat label="Menunggu" value={stats.pending} icon={<Clock3 size={17}/>} />
            <Stat label="Diterima" value={stats.accepted} icon={<CheckCircle2 size={17}/>} />
            <Stat label="Ditolak" value={stats.rejected} icon={<XCircle size={17}/>} />
            <Stat label="Pembayaran OK" value={stats.paid} icon={<CreditCard size={17}/>} />
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,190px))_auto]">
            <label className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kode, nama, PB/klub, WhatsApp..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"/></label>
            <Select value={category} onChange={setCategory} options={categories} label="Kategori" />
            <Select value={registrationStatus} onChange={setRegistrationStatus} options={['Semua','pending','diterima','ditolak']} label="Status Pendaftaran" />
            <Select value={paymentStatus} onChange={setPaymentStatus} options={['Semua','menunggu','terverifikasi']} label="Pembayaran" />
            <button onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase text-slate-600 transition hover:border-blue-300 hover:text-blue-700"><Filter size={15}/> Reset</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Daftar Peserta</h2><p className="mt-1 text-[11px] text-slate-500">Menampilkan {visible.length} dari {filtered.length} data hasil filter.</p></div><span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 sm:inline-flex">Realtime</span></div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">No</th><th className="px-4 py-3">Peserta / Kode</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">PB / Domisili</th><th className="px-4 py-3">Pembayaran</th><th className="px-4 py-3">Pendaftaran</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400">Memuat data peserta...</td></tr> : visible.length===0 ? <Empty/> : visible.map((r,i)=><Row key={String(r.id)} row={r} index={(safePage-1)*pageSize+i+1} onDetail={openDetail} onEdit={()=>setEditing({...r})} onPayment={verifyPayment} onAccept={()=>void updateStatus(r,'Diterima')} onReject={()=>void updateStatus(r,'Ditolak')} onDelete={deleteRow} badge={badge}/>)}</tbody></table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">{loading ? <div className="p-10 text-center text-sm text-slate-400">Memuat data peserta...</div> : visible.length===0 ? <Empty/> : visible.map((r,i)=><MobileRow key={String(r.id)} row={r} index={(safePage-1)*pageSize+i+1} onDetail={openDetail} onEdit={()=>setEditing({...r})} onPayment={verifyPayment} onAccept={()=>void updateStatus(r,'Diterima')} onReject={()=>void updateStatus(r,'Ditolak')} onDelete={deleteRow} badge={badge}/>)}</div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-500">Halaman {safePage} / {totalPages}</p><div className="flex gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 disabled:opacity-30">Sebelumnya</button><button disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 disabled:opacity-30">Berikutnya</button></div></div>
        </section>
      </div>

      {selected && <DetailModal row={selected} urls={documentUrls} loading={docsLoading} onClose={()=>setSelected(null)} />}
      {editing && <EditModal row={editing} saving={saving} onChange={setEditing} onClose={()=>{if(!saving)setEditing(null)}} onSave={saveEdit} />}
    </div>
  );
}

function Stat({label,value,icon}:{label:string,value:number,icon:React.ReactNode}) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{icon}<span>{label}</span></div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>; }
function Select({value,onChange,options,label}:{value:string,onChange:(v:string)=>void,options:string[],label:string}) { return <label><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"><option value="Semua">Semua</option>{options.filter(x=>x!=='Semua').map(x=><option key={x} value={x}>{x}</option>)}</select></label>; }
function Empty(){return <div className="p-12 text-center"><Users className="mx-auto mb-3 text-slate-300" size={34}/><p className="text-sm font-bold text-slate-600">Tidak ada pendaftaran ditemukan</p><p className="mt-1 text-xs text-slate-400">Coba ubah kata kunci atau filter.</p></div>;}

function Row({row,index,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,badge}:{row:Registration,index:number,onDetail:(r:Registration)=>void,onEdit:()=>void,onPayment:(r:Registration)=>void,onAccept:()=>void,onReject:()=>void,onDelete:(r:Registration)=>void,badge:(v:string,t?:'green'|'red'|'amber'|'blue')=>React.ReactNode}) {
  const rs=statusReg(row.status_pendaftaran), ps=statusPay(row.status_pembayaran);
  return <tr className="transition hover:bg-slate-50/80"><td className="px-4 py-4 text-xs text-slate-400">{index}</td><td className="px-4 py-4"><div className="text-sm font-extrabold text-slate-900">{clean(row.nama_pemain_1)||'-'} <span className="text-slate-300">&</span> {clean(row.nama_pemain_2)||'-'}</div><div className="mt-1 font-mono text-[10px] font-bold text-blue-600">{clean(row.kode_pendaftaran)||`ID ${row.id}`}</div></td><td className="px-4 py-4 text-xs font-semibold text-slate-600">{clean(row.kategori)||'-'}</td><td className="px-4 py-4"><div className="text-xs font-bold text-slate-700">{clean(row.asal_pb)||'-'}</div><div className="mt-1 text-[11px] text-slate-400">{clean(row.domisili)||'-'}</div></td><td className="px-4 py-4">{ps==='terverifikasi'?badge('Terverifikasi','green'):badge('Menunggu','amber')}</td><td className="px-4 py-4">{rs==='diterima'?badge('Diterima','green'):rs==='ditolak'?badge('Ditolak','red'):badge('Pending','amber')}</td><td className="whitespace-nowrap px-4 py-4 text-[11px] text-slate-500">{dateId(row.created_at)}</td><td className="px-4 py-4"><Actions row={row} onDetail={onDetail} onEdit={onEdit} onPayment={onPayment} onAccept={onAccept} onReject={onReject} onDelete={onDelete}/></td></tr>;
}
function MobileRow({row,index,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,badge}:{row:Registration,index:number,onDetail:(r:Registration)=>void,onEdit:()=>void,onPayment:(r:Registration)=>void,onAccept:()=>void,onReject:()=>void,onDelete:(r:Registration)=>void,badge:(v:string,t?:'green'|'red'|'amber'|'blue')=>React.ReactNode}){const rs=statusReg(row.status_pendaftaran),ps=statusPay(row.status_pembayaran);return <article className="p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Users size={18}/></div><div className="min-w-0 flex-1"><div className="text-sm font-extrabold text-slate-900">{clean(row.nama_pemain_1)||'-'} <span className="text-slate-300">&</span> {clean(row.nama_pemain_2)||'-'}</div><div className="mt-1 font-mono text-[9px] font-bold text-blue-600">#{index} • {clean(row.kode_pendaftaran)||'Tanpa kode'}</div><div className="mt-2 flex flex-wrap gap-1.5">{badge(clean(row.kategori)||'Tanpa kategori','blue')}{ps==='terverifikasi'?badge('Pembayaran OK','green'):badge('Bayar Menunggu','amber')}{rs==='diterima'?badge('Diterima','green'):rs==='ditolak'?badge('Ditolak','red'):badge('Pending','amber')}</div><p className="mt-2 text-[11px] text-slate-500">{clean(row.asal_pb)||'-'} • {clean(row.domisili)||'-'}</p></div></div><div className="mt-3"><Actions row={row} onDetail={onDetail} onEdit={onEdit} onPayment={onPayment} onAccept={onAccept} onReject={onReject} onDelete={onDelete} full/></div></article>;}
function Actions({row,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,full=false}:{row:Registration,onDetail:(r:Registration)=>void,onEdit:()=>void,onPayment:(r:Registration)=>void,onAccept:()=>void,onReject:()=>void,onDelete:(r:Registration)=>void,full?:boolean}){const rs=statusReg(row.status_pendaftaran),ps=statusPay(row.status_pembayaran);return <div className={`flex ${full?'w-full':'justify-end'} flex-wrap gap-1.5`}><button title="Lihat detail & dokumen" onClick={()=>void onDetail(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-black text-blue-700 hover:bg-blue-100"><Eye size={14}/> Detail</button><button title="Edit" onClick={onEdit} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 hover:bg-slate-50"><Pencil size={14}/> Edit</button>{ps!=='terverifikasi'&&<button title="Verifikasi pembayaran" onClick={()=>void onPayment(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"><CreditCard size={14}/> Bayar</button>}{rs==='pending'&&<><button title="Terima" onClick={onAccept} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-black text-white hover:bg-emerald-700"><CheckCircle2 size={14}/> Terima</button><button title="Tolak" onClick={onReject} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700"><XCircle size={14}/> Tolak</button></>}<button title="Hapus" onClick={()=>void onDelete(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100"><Trash2 size={14}/> Hapus</button></div>;}

function DetailModal({row,urls,loading,onClose}:{row:Registration,urls:Record<string,string>,loading:boolean,onClose:()=>void}){
  return <div className="fixed inset-0 z-[1000] bg-slate-950/65 p-3 backdrop-blur-sm" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><div className="mx-auto flex max-h-[calc(100dvh-24px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">Verifikasi Dokumen</p><h2 className="mt-1 text-base font-black text-slate-900 sm:text-xl">Detail Pendaftaran Peserta</h2><p className="mt-0.5 font-mono text-[10px] text-slate-500">{clean(row.kode_pendaftaran)||'Tanpa kode'} • {dateId(row.created_at)}</p></div><button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X size={18}/></button></div><div className="min-h-0 overflow-y-auto p-4 sm:p-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Kategori',row.kategori],['WhatsApp',row.whatsapp],['Asal PB / Klub',row.asal_pb],['Domisili',row.domisili],['NIK Pemain 1',row.nik_pemain_1],['Wilayah NIK P1',row.wilayah_nik_pemain_1],['NIK Pemain 2',row.nik_pemain_2],['Wilayah NIK P2',row.wilayah_nik_pemain_2]].map(([k,v])=><Info key={String(k)} label={String(k)} value={clean(v)||'-'}/>)}</div><div className="mt-5 grid gap-4 lg:grid-cols-2"><DocumentCard title="Pemain 1" name={row.nama_pemain_1} photoUrl={urls.foto1} ktpUrl={urls.ktp1} nik={row.nik_pemain_1} loading={loading}/><DocumentCard title="Pemain 2" name={row.nama_pemain_2} photoUrl={urls.foto2} ktpUrl={urls.ktp2} nik={row.nik_pemain_2} loading={loading}/></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><DocumentPreview title="Bukti Pembayaran" url={urls.payment || publicOrPathUrl(row.bukti_pembayaran_url)} icon={<CreditCard size={16}/>} empty="Bukti pembayaran tidak tersedia sebagai URL publik."/><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-700"><ShieldCheck size={17}/><h3 className="text-xs font-black uppercase tracking-wider">Verifikasi NIK</h3></div><p className="mt-2 text-xs font-bold text-slate-800">{clean(row.verifikasi_nik_status)||'Belum ada status'}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{clean(row.verifikasi_nik_detail)||'Detail pemeriksaan NIK belum tersedia.'}</p></div></div></div></div></div>;
}
function DocumentCard({title,name,photoUrl,ktpUrl,nik,loading}:{title:string,name?:string,photoUrl?:string,ktpUrl?:string,nik?:string|null,loading:boolean}){return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-wider text-blue-600">{title}</p><h3 className="mt-1 text-sm font-black text-slate-900">{clean(name)||'-'}</h3></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">NIK {clean(nik)||'—'}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><DocumentPreview title="Foto Terbaru" url={photoUrl} icon={<ImageIcon size={15}/>} empty={loading?'Memuat dokumen...':'Foto peserta tidak tersedia.'}/><DocumentPreview title="KTP" url={ktpUrl} icon={<FileText size={15}/>} empty={loading?'Memuat dokumen...':'KTP tidak tersedia atau tidak dapat dibuatkan tautan aman.'}/></div></div>;}
function DocumentPreview({title,url,icon,empty}:{title:string,url?:string,icon:React.ReactNode,empty:string}){return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">{icon}{title}</span>{url&&<a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 hover:underline">Buka <ExternalLink size={11}/></a>}</div>{url?<div className="bg-slate-100 p-2"><img src={url} alt={title} className="h-44 w-full rounded-lg object-contain bg-slate-200" loading="lazy"/></div>:<div className="flex h-44 items-center justify-center p-4 text-center text-[10px] font-semibold text-slate-400">{empty}</div>}</div>;}
function Info({label,value}:{label:string,value:string}){return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{value}</p></div>;}
function EditModal({row,saving,onChange,onClose,onSave}:{row:Registration,saving:boolean,onChange:(r:Registration)=>void,onClose:()=>void,onSave:(e:React.FormEvent)=>void}){const set=(k:keyof Registration,v:string)=>onChange({...row,[k]:v});return <div className="fixed inset-0 z-[1000] bg-slate-950/65 p-3 backdrop-blur-sm"><div className="mx-auto max-h-[calc(100dvh-24px)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Edit Peserta</p><h2 className="mt-1 text-xl font-black text-slate-900">Perbarui Data Pendaftaran</h2></div><button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={18}/></button></div><form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">{[['nama_pemain_1','Nama Pemain 1'],['nama_pemain_2','Nama Pemain 2'],['whatsapp','WhatsApp'],['email','Email'],['asal_pb','Asal PB / Klub'],['domisili','Domisili']].map(([k,l])=><label key={k}><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-600">{l}</span><input value={clean(row[k])} onChange={e=>set(k as keyof Registration,e.target.value)} style={{color:'#0f172a',WebkitTextFillColor:'#0f172a',opacity:1}} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm !text-slate-900 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>)}<label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-600">Kategori</span><input value={clean(row.kategori)} onChange={e=>set('kategori',e.target.value)} style={{color:'#0f172a',WebkitTextFillColor:'#0f172a',opacity:1}} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm !text-slate-900 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><div className="flex gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-xl border border-slate-200 text-xs font-black text-slate-600">Batal</button><button disabled={saving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black text-white disabled:opacity-50"><Save size={15}/>{saving?'Menyimpan...':'Simpan Perubahan'}</button></div></form></div></div>;}
