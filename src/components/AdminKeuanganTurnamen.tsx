import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Download, Edit3, HandCoins, Plus, RefreshCw, Save, ShieldCheck, Trash2, Trophy, Users, Wallet, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type T = { id: number; name: string; is_active: boolean };
type Income = { id: number; tournament_id: number; source_name: string; classification: string | null; amount: number; received_at: string | null; notes: string | null };
type Expense = { id: number; tournament_id: number; description: string; category: string | null; amount: number; expense_date: string | null; notes: string | null };
type Kind = { id: number; tournament_id: number; item_name: string; quantity: number; unit: string | null; donor_name: string | null; notes: string | null };
type ModalType = 'income' | 'expense' | 'kind';

const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const dateId = (v?: string | null) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const emptyIncome = { source_name: '', classification: '', amount: 0, received_at: '2026-09-12', notes: '' };
const emptyExpense = { description: '', category: '', amount: 0, expense_date: '2026-09-12', notes: '' };
const emptyKind = { item_name: '', quantity: 1, unit: 'pcs', donor_name: '', notes: '' };

export default function AdminKeuanganTurnamen() {
  const [tournaments, setTournaments] = useState<T[]>([]);
  const [tid, setTid] = useState<number | null>(null);
  const [income, setIncome] = useState<Income[]>([]);
  const [expense, setExpense] = useState<Expense[]>([]);
  const [kind, setKind] = useState<Kind[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'income' | 'expense' | 'kind'>('dashboard');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalType | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await supabase.from('seeded_tournaments').select('id,name,is_active').order('is_active', { ascending: false }).order('event_start', { ascending: false });
      if (t.error) throw t.error;
      const ts = (t.data || []) as T[];
      setTournaments(ts);
      const active = tid && ts.some(x => x.id === tid) ? tid : (ts.find(x => x.is_active)?.id ?? ts[0]?.id ?? null);
      setTid(active);
      if (!active) {
        setIncome([]); setExpense([]); setKind([]);
        return;
      }
      const [i, e, k] = await Promise.all([
        supabase.from('tournament_finance_income').select('*').eq('tournament_id', active).order('received_at', { ascending: false }),
        supabase.from('tournament_finance_expense').select('*').eq('tournament_id', active).order('expense_date', { ascending: false }),
        supabase.from('tournament_finance_kind_in').select('*').eq('tournament_id', active).order('created_at', { ascending: false }),
      ]);
      if (i.error) throw i.error;
      if (e.error) throw e.error;
      if (k.error) throw k.error;
      setIncome((i.data || []) as Income[]);
      setExpense((e.data || []) as Expense[]);
      setKind((k.data || []) as Kind[]);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal memuat keuangan', text: e?.message || 'Periksa database.' });
    } finally {
      setLoading(false);
    }
  }, [tid]);

  useEffect(() => { void load(); }, [load]);

  const selected = tournaments.find(x => x.id === tid);
  const totalIn = income.reduce((a, x) => a + Number(x.amount || 0), 0);
  const totalOut = expense.reduce((a, x) => a + Number(x.amount || 0), 0);
  const balance = totalIn - totalOut;
  const sponsor = income.filter(x => !['Uang Registrasi Peserta', 'Penjualan Shuttlecock'].includes(x.source_name)).reduce((a, x) => a + Number(x.amount || 0), 0);
  const reg = income.find(x => x.source_name === 'Uang Registrasi Peserta')?.amount || 0;
  const refund = expense.filter(x => x.description.toLowerCase().includes('pengembalian')).reduce((a, x) => a + Number(x.amount || 0), 0);
  const effective = 118;
  const discrepancy = totalOut - 55303800;
  const rows = (tab === 'income' ? income : expense).filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));

  const open = (type: ModalType, row?: any) => {
    setModal(type);
    setEditing(row?.id ?? null);
    setForm(row ? { ...row } : { ...(type === 'income' ? emptyIncome : type === 'expense' ? emptyExpense : emptyKind) });
  };
  const close = () => { if (!saving) { setModal(null); setEditing(null); setForm({}); } };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tid || !modal) return;
    if (modal === 'income' && !String(form.source_name || '').trim()) return Swal.fire({ icon: 'warning', title: 'Sumber pemasukan wajib diisi' });
    if (modal === 'expense' && !String(form.description || '').trim()) return Swal.fire({ icon: 'warning', title: 'Uraian pengeluaran wajib diisi' });
    if (modal === 'kind' && !String(form.item_name || '').trim()) return Swal.fire({ icon: 'warning', title: 'Nama barang wajib diisi' });
    if (modal !== 'kind' && Number(form.amount) <= 0) return Swal.fire({ icon: 'warning', title: 'Jumlah harus lebih dari 0' });
    if (modal === 'kind' && Number(form.quantity) <= 0) return Swal.fire({ icon: 'warning', title: 'Jumlah barang harus lebih dari 0' });
    setSaving(true);
    try {
      const table = modal === 'income' ? 'tournament_finance_income' : modal === 'expense' ? 'tournament_finance_expense' : 'tournament_finance_kind_in';
      const payload = { ...form, tournament_id: tid };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      const result = editing ? await supabase.from(table).update(payload).eq('id', editing) : await supabase.from(table).insert(payload);
      if (result.error) throw result.error;
      close();
      await load();
      Swal.fire({ icon: 'success', title: editing ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan', timer: 1100, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan data', text: e?.message || 'Perubahan ditolak database.' });
    } finally { setSaving(false); }
  };

  const remove = async (table: string, id: number, label: string) => {
    const c = await Swal.fire({ icon: 'warning', title: 'Hapus data?', html: `<div style="font-size:13px">Data <b>${label}</b> akan dihapus permanen dari turnamen ini.</div>`, showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
    if (!c.isConfirmed) return;
    try {
      const r = await supabase.from(table).delete().eq('id', id);
      if (r.error) throw r.error;
      await load();
      Swal.fire({ icon: 'success', title: 'Data dihapus', timer: 900, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: e?.message || 'Perubahan ditolak database.' });
    }
  };

  const exportCsv = () => {
    const lines: any[][] = [
      ['LAPORAN KEUANGAN BILIBILI 162 CUP I 2026'], ['Turnamen', selected?.name || ''], [],
      ['PEMASUKAN', 'Klasifikasi', 'Jumlah', 'Tanggal', 'Catatan'],
      ...income.map(x => [x.source_name, x.classification || '', x.amount, x.received_at || '', x.notes || '']), [],
      ['PENGELUARAN', 'Kategori', 'Jumlah', 'Tanggal', 'Catatan'],
      ...expense.map(x => [x.description, x.category || '', x.amount, x.expense_date || '', x.notes || '']), [],
      ['IN-KIND', 'Jumlah', 'Satuan', 'Donatur', 'Catatan'],
      ...kind.map(x => [x.item_name, x.quantity, x.unit || '', x.donor_name || '', x.notes || '']), [],
      ['TOTAL PEMASUKAN', totalIn], ['TOTAL PENGELUARAN', totalOut], ['SALDO', balance],
    ];
    const csv = lines.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'Laporan-Keuangan-Bilibili-162-Cup-I-2026.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const addButton = (type: ModalType, text: string) => <button onClick={() => open(type)} className="btn inline-flex items-center justify-center gap-2"><Plus size={14} /> {text}</button>;

  return <div className="min-h-full bg-[#050b17] p-3 text-white sm:p-5 md:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="rounded-[28px] border border-emerald-400/20 bg-gradient-to-br from-[#071a22] via-[#0b1730] to-[#050914] p-5 shadow-2xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300"><Wallet size={14}/> Keuangan Turnamen</span><h1 className="mt-3 text-2xl font-black uppercase tracking-tight sm:text-4xl">Laporan Keuangan & Pertanggungjawaban Kas</h1><p className="mt-2 max-w-4xl text-xs leading-5 text-slate-300 sm:text-sm">Kelola seluruh pemasukan, pengeluaran, refund, sponsorship barang, dan transaksi turnamen secara langsung dari halaman admin.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button><button onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black uppercase"><Download size={15}/> Export CSV</button></div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:flex-row sm:items-center"><Trophy size={17} className="text-amber-300"/><select value={tid ?? ''} onChange={e => setTid(Number(e.target.value))} className="min-h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-bold text-white outline-none">{tournaments.map(t => <option key={t.id} value={t.id}>{t.is_active ? '● AKTIF — ' : ''}{t.name}</option>)}</select><span className="text-[9px] font-black uppercase text-slate-500">Update resmi: 12 September 2026</span></div>

      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-3"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-black uppercase tracking-wider text-blue-200">Tambah Data</span>{addButton('income', 'Pemasukan')}{addButton('expense', 'Pengeluaran')}{addButton('kind', 'In-Kind')}</div></div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Card title="Pemasukan" value={rupiah(totalIn)} icon={<HandCoins size={18}/>} /><Card title="Pengeluaran" value={rupiah(totalOut)} icon={<Wallet size={18}/>} /><Card title="Saldo Kas" value={rupiah(balance)} icon={<BarChart3 size={18}/>} danger={balance < 0}/><Card title="Sponsor & Donatur" value={rupiah(sponsor)} icon={<ShieldCheck size={18}/>} /><Card title="Peserta Efektif" value={`${effective} pasang`} icon={<Users size={18}/>} /></section>

      {discrepancy !== 0 && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-amber-300"/><div><p className="text-xs font-black uppercase text-amber-200">Pemeriksaan angka laporan</p><p className="mt-1 text-xs leading-5 text-slate-300">Jumlah rincian pengeluaran saat ini menghasilkan <b className="text-white">{rupiah(totalOut)}</b>, sedangkan TOTAL PENGELUARAN pada laporan tertulis adalah <b className="text-white">Rp 55.303.800</b>. Selisih <b className="text-amber-200">{rupiah(Math.abs(discrepancy))}</b>. Sistem tidak mengubah angka sumber secara otomatis.</p><p className="mt-1 text-[10px] font-bold text-amber-300">Saldo berdasarkan transaksi database saat ini: {rupiah(balance)}.</p></div></div></div>}

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
        <div className="flex flex-wrap border-b border-white/10"><button onClick={() => setTab('dashboard')} className={tab === 'dashboard' ? 'tab active' : 'tab'}>Dashboard</button><button onClick={() => setTab('income')} className={tab === 'income' ? 'tab active' : 'tab'}>Pemasukan ({income.length})</button><button onClick={() => setTab('expense')} className={tab === 'expense' ? 'tab active' : 'tab'}>Pengeluaran ({expense.length})</button><button onClick={() => setTab('kind')} className={tab === 'kind' ? 'tab active' : 'tab'}>In-Kind ({kind.length})</button></div>
        {tab === 'dashboard' ? <div className="grid gap-4 p-4 lg:grid-cols-2"><Panel title="Komposisi Pemasukan" action={addButton('income', 'Tambah')}><Row label="Sponsor & Donatur" value={sponsor}/><Row label="Registrasi Peserta" value={Number(reg)}/><Row label="Penjualan Shuttlecock" value={Number(income.find(x => x.source_name === 'Penjualan Shuttlecock')?.amount || 0)}/><Row label="TOTAL" value={totalIn} strong/></Panel><Panel title="Komposisi Pengeluaran" action={addButton('expense', 'Tambah')}><Row label="Hadiah Pembinaan" value={expense.filter(x => x.description === 'Hadiah Pembinaan Juara').reduce((a, x) => a + Number(x.amount), 0)}/><Row label="Honor Perangkat & Linesman" value={expense.filter(x => x.description.toLowerCase().includes('honor')).reduce((a, x) => a + Number(x.amount), 0)}/><Row label="Konsumsi & Logistik" value={expense.filter(x => x.description.toLowerCase().includes('konsumsi')).reduce((a, x) => a + Number(x.amount), 0)}/><Row label="Refund Registrasi" value={refund}/><Row label="TOTAL RINCIAN" value={totalOut} strong/></Panel><Panel title="Kepesertaan"><Row label="Pendaftar awal" value={126} suffix=" pasang"/><Row label="Refund" value={8} suffix=" pasang"/><Row label="Efektif bertanding" value={effective} suffix=" pasang" strong/></Panel><Panel title="Sponsorship Barang" action={addButton('kind', 'Tambah')}><Row label="Seragam Wasit & Referee" value={14} suffix=" pcs"/><p className="mt-2 text-[10px] text-slate-500">Donatur: {kind[0]?.donor_name || 'Bapak Gusmulyadi'}</p></Panel></div> : tab === 'kind' ? <div className="p-4"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-between"><div><p className="text-sm font-black">Data Sponsorship Barang / In-Kind</p><p className="text-[10px] text-slate-500">Edit atau hapus setiap item secara langsung.</p></div>{addButton('kind', 'Tambah In-Kind')}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{kind.length === 0 ? <Empty text="Belum ada data in-kind." /> : kind.map(x => <div key={x.id} className="rounded-xl border border-white/5 bg-slate-950/60 p-4"><p className="font-black">{x.item_name}</p><p className="mt-1 text-xs text-slate-400">{x.quantity} {x.unit || ''} • Donatur: {x.donor_name || '-'}</p>{x.notes && <p className="mt-2 text-[10px] text-slate-500">{x.notes}</p>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => open('kind', x)} className="btn small"><Edit3 size={13}/> Edit</button><button onClick={() => void remove('tournament_finance_kind_in', x.id, x.item_name)} className="btn small danger"><Trash2 size={13}/> Hapus</button></div></div>)}</div></div> : <div className="p-4"><div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari transaksi..." className="min-h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none"/>{addButton(tab === 'income' ? 'income' : 'expense', tab === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran')}</div><div className="overflow-x-auto rounded-xl border border-white/5"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-950 text-[9px] uppercase text-slate-500"><tr><th className="p-3">No</th><th className="p-3">Uraian / Sumber</th><th className="p-3">Klasifikasi</th><th className="p-3">Tanggal</th><th className="p-3 text-right">Jumlah</th><th className="p-3">Catatan</th><th className="p-3">Aksi</th></tr></thead><tbody className="divide-y divide-white/5">{rows.length === 0 ? <tr><td colSpan={7}><Empty text="Belum ada transaksi sesuai pencarian." /></td></tr> : rows.map((x: any, i) => <tr key={x.id}><td className="p-3 text-slate-500">{i + 1}</td><td className="p-3 font-bold">{x.source_name || x.description}</td><td className="p-3 text-slate-400">{x.classification || x.category || '-'}</td><td className="p-3 text-slate-500">{dateId(x.received_at || x.expense_date)}</td><td className="p-3 text-right font-black">{rupiah(Number(x.amount))}</td><td className="max-w-[260px] p-3 text-slate-500">{x.notes || '-'}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={() => open(tab === 'income' ? 'income' : 'expense', x)} className="btn small"><Edit3 size={13}/> Edit</button><button onClick={() => void remove(tab === 'income' ? 'tournament_finance_income' : 'tournament_finance_expense', x.id, x.source_name || x.description)} className="btn small danger"><Trash2 size={13}/> Hapus</button></div></td></tr>)}</tbody></table></div></div>}
      </div>

      {modal && <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#0b1324] p-5 sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-wider text-blue-300">{selected?.name || 'Turnamen'}</p><h2 className="mt-1 font-black uppercase">{editing ? 'Edit' : 'Tambah'} {modal === 'income' ? 'Pemasukan' : modal === 'expense' ? 'Pengeluaran' : 'In-Kind'}</h2></div><button type="button" onClick={close} disabled={saving} className="rounded-xl p-2 hover:bg-white/10"><X/></button></div><div className="grid gap-3 sm:grid-cols-2">{modal === 'income' ? <><Field label="Sumber Pemasukan *" value={form.source_name} onChange={(v: string) => setForm({...form, source_name: v})}/><Field label="Klasifikasi" value={form.classification} onChange={(v: string) => setForm({...form, classification: v})}/><Field label="Jumlah (Rp) *" type="number" value={form.amount} onChange={(v: string) => setForm({...form, amount: Number(v)})}/><Field label="Tanggal" type="date" value={form.received_at} onChange={(v: string) => setForm({...form, received_at: v})}/></> : modal === 'expense' ? <><Field label="Uraian Pengeluaran *" value={form.description} onChange={(v: string) => setForm({...form, description: v})}/><Field label="Kategori" value={form.category} onChange={(v: string) => setForm({...form, category: v})}/><Field label="Jumlah (Rp) *" type="number" value={form.amount} onChange={(v: string) => setForm({...form, amount: Number(v)})}/><Field label="Tanggal" type="date" value={form.expense_date} onChange={(v: string) => setForm({...form, expense_date: v})}/></> : <><Field label="Nama Barang *" value={form.item_name} onChange={(v: string) => setForm({...form, item_name: v})}/><Field label="Jumlah *" type="number" value={form.quantity} onChange={(v: string) => setForm({...form, quantity: Number(v)})}/><Field label="Satuan" value={form.unit} onChange={(v: string) => setForm({...form, unit: v})}/><Field label="Donatur" value={form.donor_name} onChange={(v: string) => setForm({...form, donor_name: v})}/></>}<label className="sm:col-span-2"><span className="mb-1 block text-[9px] font-black uppercase text-slate-500">Catatan</span><textarea value={form.notes ?? ''} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs text-white outline-none focus:border-blue-500" placeholder="Tambahkan catatan / keterangan bila diperlukan..."/></label></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={close} disabled={saving} className="btn">Batal</button><button disabled={saving} className="btn bg-blue-600"><Save size={14}/>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Data'}</button></div></form></div>}
    </div>
  </div>;
}

function Card({ title, value, icon, danger = false }: { title: string; value: string; icon: React.ReactNode; danger?: boolean }) { return <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3"><div className="flex justify-between text-slate-500"><span className="text-[9px] font-black uppercase">{title}</span>{icon}</div><b className={`mt-2 block text-base font-black sm:text-lg ${danger ? 'text-red-300' : ''}`}>{value}</b></div>; }
function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) { return <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4"><div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-xs font-black uppercase text-slate-300">{title}</h3>{action}</div>{children}</div>; }
function Row({ label, value, strong = false, suffix = '' }: { label: string; value: number; strong?: boolean; suffix?: string }) { return <div className="flex justify-between border-b border-white/5 py-2 text-xs last:border-0"><span className={strong ? 'font-black text-white' : 'text-slate-400'}>{label}</span><b className={strong ? 'text-emerald-300' : 'text-slate-200'}>{typeof value === 'number' && suffix === '' ? rupiah(value) : `${value}${suffix}`}</b></div>; }
function Field({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) { return <label><span className="mb-1 block text-[9px] font-black uppercase text-slate-500">{label}</span><input required={label.includes('*')} min={type === 'number' ? '0' : undefined} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500"/></label>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-xs text-slate-500">{text}</div>; }
