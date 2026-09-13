import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, Download, Edit3, HandCoins, Plus, RefreshCw, Search, ShieldCheck, Trash2, Trophy, Users, Wallet, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type T = { id: number; name: string; is_active: boolean };
type Income = { id: number; tournament_id: number; source_name: string; classification: string | null; amount: number; received_at: string | null; notes: string | null };
type Expense = { id: number; tournament_id: number; description: string; category: string | null; amount: number; expense_date: string | null; notes: string | null };
type Kind = { id: number; tournament_id: number; item_name: string; quantity: number; unit: string | null; donor_name: string | null; notes: string | null };
type ModalType = 'income' | 'expense' | 'kind';
type FormState = { source_name?: string; classification?: string; amount?: number | string; received_at?: string; notes?: string; description?: string; category?: string; expense_date?: string; item_name?: string; quantity?: number | string; unit?: string; donor_name?: string };

const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const dateId = (v?: string | null) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const todayISO = () => new Date().toISOString().slice(0, 10);
const emptyIncome = (): FormState => ({ source_name: '', classification: '', amount: '', received_at: todayISO(), notes: '' });
const emptyExpense = (): FormState => ({ description: '', category: '', amount: '', expense_date: todayISO(), notes: '' });
const emptyKind = (): FormState => ({ item_name: '', quantity: 1, unit: 'pcs', donor_name: '', notes: '' });
const incomeTable = 'tournament_finance_income';
const expenseTable = 'tournament_finance_expense';
const kindTable = 'tournament_finance_kind_in';

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
  const [form, setForm] = useState<FormState>({});

  const loadTournaments = useCallback(async () => {
    const t = await supabase.from('seeded_tournaments').select('id,name,is_active').order('is_active', { ascending: false }).order('event_start', { ascending: false });
    if (t.error) throw t.error;
    const ts = (t.data || []) as T[];
    setTournaments(ts);
    setTid(prev => prev && ts.some(x => x.id === prev) ? prev : (ts.find(x => x.is_active)?.id ?? ts[0]?.id ?? null));
    return ts;
  }, []);

  const loadFinance = useCallback(async (tournamentId: number | null) => {
    if (!tournamentId) { setIncome([]); setExpense([]); setKind([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [i, e, k] = await Promise.all([
        supabase.from(incomeTable).select('*').eq('tournament_id', tournamentId).order('received_at', { ascending: false }).order('id', { ascending: false }),
        supabase.from(expenseTable).select('*').eq('tournament_id', tournamentId).order('expense_date', { ascending: false }).order('id', { ascending: false }),
        supabase.from(kindTable).select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false }).order('id', { ascending: false }),
      ]);
      if (i.error) throw i.error; if (e.error) throw e.error; if (k.error) throw k.error;
      setIncome((i.data || []) as Income[]); setExpense((e.data || []) as Expense[]); setKind((k.data || []) as Kind[]);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal memuat keuangan', text: e?.message || 'Periksa koneksi/database.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void (async () => { setLoading(true); try { await loadTournaments(); } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memuat turnamen', text: e?.message || 'Periksa database.' }); setLoading(false); } })(); }, [loadTournaments]);
  useEffect(() => { void loadFinance(tid); }, [tid, loadFinance]);

  const selected = tournaments.find(x => x.id === tid);
  const totalIn = useMemo(() => income.reduce((a, x) => a + Number(x.amount || 0), 0), [income]);
  const totalOut = useMemo(() => expense.reduce((a, x) => a + Number(x.amount || 0), 0), [expense]);
  const balance = totalIn - totalOut;
  const sponsor = useMemo(() => income.filter(x => !['Uang Registrasi Peserta', 'Penjualan Shuttlecock'].includes(x.source_name)).reduce((a, x) => a + Number(x.amount || 0), 0), [income]);
  const reg = useMemo(() => income.filter(x => x.source_name === 'Uang Registrasi Peserta').reduce((a, x) => a + Number(x.amount || 0), 0), [income]);
  const refund = useMemo(() => expense.filter(x => x.description.toLowerCase().includes('pengembalian')).reduce((a, x) => a + Number(x.amount || 0), 0), [expense]);
  const effective = 118;
  const discrepancy = totalOut - 55303800;
  const filteredIncome = useMemo(() => income.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase())), [income, q]);
  const filteredExpense = useMemo(() => expense.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase())), [expense, q]);
  const filteredKind = useMemo(() => kind.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase())), [kind, q]);

  const open = (type: ModalType, row?: Income | Expense | Kind) => { setModal(type); setEditing(row?.id ?? null); setForm(row ? { ...row } : type === 'income' ? emptyIncome() : type === 'expense' ? emptyExpense() : emptyKind()); };
  const close = () => { if (!saving) { setModal(null); setEditing(null); setForm({}); } };
  const updateField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!tid || !modal) return;
    const source = String(form.source_name || '').trim(); const description = String(form.description || '').trim(); const item = String(form.item_name || '').trim();
    if (modal === 'income' && !source) return void Swal.fire({ icon: 'warning', title: 'Sumber pemasukan wajib diisi' });
    if (modal === 'expense' && !description) return void Swal.fire({ icon: 'warning', title: 'Uraian pengeluaran wajib diisi' });
    if (modal === 'kind' && !item) return void Swal.fire({ icon: 'warning', title: 'Nama barang wajib diisi' });
    if (modal !== 'kind' && Number(form.amount) <= 0) return void Swal.fire({ icon: 'warning', title: 'Jumlah harus lebih dari 0' });
    if (modal === 'kind' && Number(form.quantity) <= 0) return void Swal.fire({ icon: 'warning', title: 'Jumlah barang harus lebih dari 0' });
    setSaving(true);
    try {
      const table = modal === 'income' ? incomeTable : modal === 'expense' ? expenseTable : kindTable;
      const payload: Record<string, any> = { ...form, tournament_id: tid };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (modal !== 'kind') payload.amount = Number(form.amount); else payload.quantity = Number(form.quantity);
      Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null; });
      const result = editing
        ? await (supabase.from(table) as any).update(payload).eq('id', editing).eq('tournament_id', tid).select('id').single()
        : await (supabase.from(table) as any).insert(payload).select('id').single();
      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error('Database tidak mengembalikan ID transaksi.');
      close(); await loadFinance(tid); await loadTournaments();
      Swal.fire({ icon: 'success', title: editing ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan', text: 'Perubahan sudah tersimpan.', timer: 1200, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan data', text: e?.message || 'Perubahan ditolak database.' }); }
    finally { setSaving(false); }
  };

  const remove = async (table: string, id: number, label: string) => {
    const c = await Swal.fire({ icon: 'warning', title: 'Hapus data?', html: `<div style="font-size:13px;line-height:1.6">Data <b>${label.replace(/[<>]/g, '')}</b> akan dihapus permanen.<br><span style="opacity:.7">Pastikan transaksi yang dipilih sudah benar.</span></div>`, showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626', reverseButtons: true });
    if (!c.isConfirmed || !tid) return;
    try {
      const r = await (supabase.from(table) as any).delete().eq('id', id).eq('tournament_id', tid).select('id');
      if (r.error) throw r.error;
      if (!Array.isArray(r.data) || r.data.length !== 1) throw new Error('Data tidak terhapus. Periksa izin DELETE/RLS database.');
      const verify = await (supabase.from(table) as any).select('id').eq('id', id).maybeSingle();
      if (verify.error) throw verify.error;
      if (verify.data) throw new Error('Data masih ditemukan setelah penghapusan. Silakan refresh dan periksa kebijakan database.');
      await loadFinance(tid);
      Swal.fire({ icon: 'success', title: 'Data berhasil dihapus', timer: 1000, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus data', text: e?.message || 'Perubahan ditolak database.' }); }
  };

  const exportCsv = () => {
    const lines: any[][] = [['LAPORAN KEUANGAN BILIBILI 162 CUP I 2026'], ['Turnamen', selected?.name || ''], [], ['PEMASUKAN', 'Klasifikasi', 'Jumlah', 'Tanggal', 'Catatan'], ...income.map(x => [x.source_name, x.classification || '', x.amount, x.received_at || '', x.notes || '']), [], ['PENGELUARAN', 'Kategori', 'Jumlah', 'Tanggal', 'Catatan'], ...expense.map(x => [x.description, x.category || '', x.amount, x.expense_date || '', x.notes || '']), [], ['IN-KIND', 'Jumlah', 'Satuan', 'Donatur', 'Catatan'], ...kind.map(x => [x.item_name, x.quantity, x.unit || '', x.donor_name || '', x.notes || '']), [], ['TOTAL PEMASUKAN', totalIn], ['TOTAL PENGELUARAN', totalOut], ['SALDO', balance]];
    const csv = lines.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `Laporan-Keuangan-${(selected?.name || 'Turnamen').replace(/[^a-z0-9]+/gi, '-')}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const addButton = (type: ModalType, text: string) => <button onClick={() => open(type)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-[10px] font-black uppercase tracking-wide transition hover:bg-emerald-500 active:scale-[.98]"><Plus size={14} /> {text}</button>;

  return <div className="min-h-full bg-[#050b17] p-3 text-white sm:p-5 lg:p-8"><div className="mx-auto max-w-[1550px] space-y-4 sm:space-y-5">
    <header className="overflow-hidden rounded-[24px] border border-emerald-400/20 bg-gradient-to-br from-[#071a22] via-[#0b1730] to-[#050914] p-4 shadow-2xl sm:rounded-[28px] sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300"><Wallet size={14} /> Keuangan Turnamen</span><h1 className="mt-3 text-xl font-black uppercase leading-tight tracking-tight sm:text-3xl lg:text-4xl">Laporan Keuangan & Pertanggungjawaban Kas</h1><p className="mt-2 max-w-4xl text-[11px] leading-5 text-slate-300 sm:text-sm">Kelola pemasukan, pengeluaran, refund, sponsorship barang, serta transaksi turnamen. Setiap data dapat ditambah, diedit, dan dihapus langsung dari admin.</p></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><button onClick={() => void loadFinance(tid)} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[9px] font-black uppercase transition hover:bg-white/10 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button><button onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[9px] font-black uppercase transition hover:bg-blue-500"><Download size={15} /> Export CSV</button></div></div></header>

    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><Trophy size={17} className="shrink-0 text-amber-300" /><select value={tid ?? ''} onChange={e => setTid(Number(e.target.value) || null)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-bold text-white outline-none"><option value="">Pilih turnamen...</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.is_active ? '● AKTIF — ' : ''}{t.name}</option>)}</select></div><div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500"><CalendarDays size={13} /> Update resmi: 12 September 2026</div></section>

    <section className="flex flex-col gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-3 sm:flex-row sm:items-center sm:flex-wrap"><span className="mr-1 text-[9px] font-black uppercase tracking-wider text-blue-200">Kelola Transaksi</span>{addButton('income', 'Pemasukan')}{addButton('expense', 'Pengeluaran')}{addButton('kind', 'In-Kind')}</section>

    <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3"><Card title="Pemasukan" value={rupiah(totalIn)} icon={<HandCoins size={18} />} /><Card title="Pengeluaran" value={rupiah(totalOut)} icon={<Wallet size={18} />} /><Card title="Saldo Kas" value={rupiah(balance)} icon={<BarChart3 size={18} />} danger={balance < 0} /><Card title="Sponsor & Donatur" value={rupiah(sponsor)} icon={<ShieldCheck size={18} />} /><Card title="Peserta Efektif" value={`${effective} pasang`} icon={<Users size={18} />} /></section>

    {discrepancy !== 0 && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 sm:p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-300" /><div><p className="text-[10px] font-black uppercase text-amber-200">Pemeriksaan angka laporan</p><p className="mt-1 text-[11px] leading-5 text-slate-300">Rincian pengeluaran saat ini menghasilkan <b className="text-white">{rupiah(totalOut)}</b>, sedangkan total tertulis pada laporan resmi adalah <b className="text-white">Rp 55.303.800</b>. Selisih <b className="text-amber-200">{rupiah(Math.abs(discrepancy))}</b>. Sistem tidak mengubah angka sumber otomatis.</p></div></div></div>}

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl"><div className="flex overflow-x-auto border-b border-white/10 scrollbar-none"><Tab active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>Dashboard</Tab><Tab active={tab === 'income'} onClick={() => setTab('income')}>Pemasukan ({income.length})</Tab><Tab active={tab === 'expense'} onClick={() => setTab('expense')}>Pengeluaran ({expense.length})</Tab><Tab active={tab === 'kind'} onClick={() => setTab('kind')}>In-Kind ({kind.length})</Tab></div>
      {tab === 'dashboard' ? <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2"><Panel title="Ringkasan Pemasukan" action={addButton('income', 'Tambah')}><Row label="Sponsor & Donatur" value={rupiah(sponsor)} /><Row label="Registrasi Peserta" value={rupiah(reg)} /><Row label="Total Pemasukan" value={rupiah(totalIn)} strong /></Panel><Panel title="Ringkasan Pengeluaran" action={addButton('expense', 'Tambah')}><Row label="Refund / Pengembalian" value={rupiah(refund)} /><Row label="Total Pengeluaran" value={rupiah(totalOut)} /><Row label="Saldo Akhir" value={rupiah(balance)} strong danger={balance < 0} /></Panel><Panel title="In-Kind / Sumbangan Barang" action={addButton('kind', 'Tambah')}>{kind.length ? kind.slice(0, 5).map(x => <Row key={x.id} label={`${x.item_name}${x.donor_name ? ` — ${x.donor_name}` : ''}`} value={`${x.quantity} ${x.unit || ''}`} />) : <Empty text="Belum ada data in-kind." />}</Panel><Panel title="Status Data"><Row label="Pemasukan" value={`${income.length} transaksi`} /><Row label="Pengeluaran" value={`${expense.length} transaksi`} /><Row label="In-Kind" value={`${kind.length} data`} /><Row label="Status Turnamen" value={selected?.is_active ? 'AKTIF' : 'ARSIP'} strong /></Panel></div> : <div className="p-3 sm:p-4"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-black uppercase sm:text-base">{tab === 'income' ? 'Daftar Pemasukan' : tab === 'expense' ? 'Daftar Pengeluaran' : 'Daftar In-Kind'}</h2><p className="mt-1 text-[10px] text-slate-500">Edit atau hapus transaksi menggunakan tombol aksi pada setiap data.</p></div><div className="flex w-full gap-2 sm:w-auto"><label className="relative flex-1 sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari transaksi..." className="min-h-10 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 text-xs outline-none focus:border-emerald-400/50" /></label>{addButton(tab, 'Tambah')}</div></div>{tab === 'income' && <IncomeTable rows={filteredIncome} onEdit={row => open('income', row)} onDelete={row => void remove(incomeTable, row.id, row.source_name)} />}{tab === 'expense' && <ExpenseTable rows={filteredExpense} onEdit={row => open('expense', row)} onDelete={row => void remove(expenseTable, row.id, row.description)} />}{tab === 'kind' && <KindTable rows={filteredKind} onEdit={row => open('kind', row)} onDelete={row => void remove(kindTable, row.id, row.item_name)} />}</div>}
    </section>
  </div>{modal && <FinanceModal type={modal} editing={!!editing} form={form} saving={saving} onChange={updateField} onClose={close} onSubmit={save} />}</div>;
}

function Card({ title, value, icon, danger }: { title: string; value: string; icon: React.ReactNode; danger?: boolean }) { return <div className={`rounded-2xl border p-3 sm:p-4 ${danger ? 'border-red-400/30 bg-red-500/10' : 'border-white/10 bg-slate-900/80'}`}><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-wide text-slate-400">{title}</span><span className="text-emerald-300">{icon}</span></div><div className={`mt-2 break-words text-sm font-black sm:text-lg ${danger ? 'text-red-300' : 'text-white'}`}>{value}</div></div>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-[10px] font-black uppercase transition sm:px-5 ${active ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-500 hover:text-white'}`}>{children}</button>; }
function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[10px] font-black uppercase tracking-wide text-slate-200">{title}</h3>{action}</div>{children}</div>; }
function Row({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) { return <div className={`flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0 ${strong ? 'font-black' : ''}`}><span className="min-w-0 text-[10px] text-slate-400">{label}</span><span className={`shrink-0 text-right text-[11px] ${danger ? 'text-red-300' : 'text-white'}`}>{value}</span></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[10px] text-slate-500">{text}</div>; }
function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="flex items-center justify-end gap-1.5"><button onClick={onEdit} title="Edit" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300 transition hover:bg-blue-500/20"><Edit3 size={14} /></button><button onClick={onDelete} title="Hapus" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"><Trash2 size={14} /></button></div>; }

function IncomeTable({ rows, onEdit, onDelete }: { rows: Income[]; onEdit: (r: Income) => void; onDelete: (r: Income) => void }) { if (!rows.length) return <Empty text="Tidak ada data pemasukan yang sesuai." />; return <div className="overflow-hidden rounded-xl border border-white/10"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Sumber</th><th className="px-4 py-3">Klasifikasi</th><th className="px-4 py-3 text-right">Jumlah</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Catatan</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map(x => <tr key={x.id} className="hover:bg-white/[.025]"><td className="px-4 py-3 text-xs font-bold">{x.source_name}</td><td className="px-4 py-3 text-[10px] text-slate-400">{x.classification || '-'}</td><td className="px-4 py-3 text-right text-xs font-black text-emerald-300">{rupiah(x.amount)}</td><td className="px-4 py-3 text-[10px] text-slate-400">{dateId(x.received_at)}</td><td className="max-w-[220px] truncate px-4 py-3 text-[10px] text-slate-400">{x.notes || '-'}</td><td className="px-4 py-3"><Actions onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} /></td></tr>)}</tbody></table></div><div className="divide-y divide-white/5 md:hidden">{rows.map(x => <MobileCard key={x.id} title={x.source_name} amount={rupiah(x.amount)} meta={`${x.classification || 'Tanpa klasifikasi'} • ${dateId(x.received_at)}`} note={x.notes} onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} />)}</div></div>; }
function ExpenseTable({ rows, onEdit, onDelete }: { rows: Expense[]; onEdit: (r: Expense) => void; onDelete: (r: Expense) => void }) { if (!rows.length) return <Empty text="Tidak ada data pengeluaran yang sesuai." />; return <div className="overflow-hidden rounded-xl border border-white/10"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Uraian</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3 text-right">Jumlah</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Catatan</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map(x => <tr key={x.id} className="hover:bg-white/[.025]"><td className="px-4 py-3 text-xs font-bold">{x.description}</td><td className="px-4 py-3 text-[10px] text-slate-400">{x.category || '-'}</td><td className="px-4 py-3 text-right text-xs font-black text-amber-300">{rupiah(x.amount)}</td><td className="px-4 py-3 text-[10px] text-slate-400">{dateId(x.expense_date)}</td><td className="max-w-[220px] truncate px-4 py-3 text-[10px] text-slate-400">{x.notes || '-'}</td><td className="px-4 py-3"><Actions onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} /></td></tr>)}</tbody></table></div><div className="divide-y divide-white/5 md:hidden">{rows.map(x => <MobileCard key={x.id} title={x.description} amount={rupiah(x.amount)} meta={`${x.category || 'Tanpa kategori'} • ${dateId(x.expense_date)}`} note={x.notes} onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} expense />)}</div></div>; }
function KindTable({ rows, onEdit, onDelete }: { rows: Kind[]; onEdit: (r: Kind) => void; onDelete: (r: Kind) => void }) { if (!rows.length) return <Empty text="Tidak ada data in-kind yang sesuai." />; return <div className="overflow-hidden rounded-xl border border-white/10"><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Barang</th><th className="px-4 py-3 text-right">Jumlah</th><th className="px-4 py-3">Satuan</th><th className="px-4 py-3">Donatur</th><th className="px-4 py-3">Catatan</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map(x => <tr key={x.id} className="hover:bg-white/[.025]"><td className="px-4 py-3 text-xs font-bold">{x.item_name}</td><td className="px-4 py-3 text-right text-xs font-black text-cyan-300">{x.quantity}</td><td className="px-4 py-3 text-[10px] text-slate-400">{x.unit || '-'}</td><td className="px-4 py-3 text-[10px] text-slate-300">{x.donor_name || '-'}</td><td className="max-w-[220px] truncate px-4 py-3 text-[10px] text-slate-400">{x.notes || '-'}</td><td className="px-4 py-3"><Actions onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} /></td></tr>)}</tbody></table></div><div className="divide-y divide-white/5 md:hidden">{rows.map(x => <MobileCard key={x.id} title={x.item_name} amount={`${x.quantity} ${x.unit || ''}`} meta={`Donatur: ${x.donor_name || '-'}`} note={x.notes} onEdit={() => onEdit(x)} onDelete={() => onDelete(x)} kind />)}</div></div>; }
function MobileCard({ title, amount, meta, note, onEdit, onDelete, expense, kind }: { title: string; amount: string; meta: string; note: string | null; onEdit: () => void; onDelete: () => void; expense?: boolean; kind?: boolean }) { return <article className="p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-xs font-black leading-5 text-white">{title}</h3><p className="mt-1 text-[9px] leading-4 text-slate-500">{meta}</p></div><span className={`shrink-0 text-xs font-black ${expense ? 'text-amber-300' : kind ? 'text-cyan-300' : 'text-emerald-300'}`}>{amount}</span></div>{note && <p className="mt-2 rounded-lg bg-white/[.025] px-2.5 py-2 text-[9px] leading-4 text-slate-400">{note}</p>}<div className="mt-3 flex justify-end"><Actions onEdit={onEdit} onDelete={onDelete} /></div></article>; }

function FinanceModal({ type, editing, form, saving, onChange, onClose, onSubmit }: { type: ModalType; editing: boolean; form: FormState; saving: boolean; onChange: (key: keyof FormState, value: string) => void; onClose: () => void; onSubmit: (e: React.FormEvent) => void }) {
  const title = editing ? 'Edit Data Keuangan' : type === 'income' ? 'Tambah Pemasukan' : type === 'expense' ? 'Tambah Pengeluaran' : 'Tambah In-Kind';
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><form onSubmit={onSubmit} className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] border border-white/10 bg-[#08111f] p-4 shadow-2xl sm:max-w-xl sm:rounded-[24px] sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Keuangan Turnamen</p><h2 className="mt-1 text-lg font-black uppercase">{title}</h2></div><button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300"><X size={16} /></button></div><div className="space-y-3">
    {type === 'income' && <><Field label="Sumber pemasukan *"><input required value={String(form.source_name || '')} onChange={e => onChange('source_name', e.target.value)} placeholder="Contoh: Sponsor / Uang Registrasi Peserta" /></Field><Field label="Klasifikasi"><input value={String(form.classification || '')} onChange={e => onChange('classification', e.target.value)} placeholder="Sponsor, Registrasi, Penjualan, dll." /></Field><Field label="Jumlah (Rp) *"><input required min="1" type="number" value={String(form.amount ?? '')} onChange={e => onChange('amount', e.target.value)} inputMode="numeric" /></Field><Field label="Tanggal diterima"><input type="date" value={String(form.received_at || '')} onChange={e => onChange('received_at', e.target.value)} /></Field></>}
    {type === 'expense' && <><Field label="Uraian pengeluaran *"><input required value={String(form.description || '')} onChange={e => onChange('description', e.target.value)} placeholder="Contoh: Sewa GOR" /></Field><Field label="Kategori"><input value={String(form.category || '')} onChange={e => onChange('category', e.target.value)} placeholder="Operasional, Hadiah, Konsumsi, dll." /></Field><Field label="Jumlah (Rp) *"><input required min="1" type="number" value={String(form.amount ?? '')} onChange={e => onChange('amount', e.target.value)} inputMode="numeric" /></Field><Field label="Tanggal pengeluaran"><input type="date" value={String(form.expense_date || '')} onChange={e => onChange('expense_date', e.target.value)} /></Field></>}
    {type === 'kind' && <><Field label="Nama barang *"><input required value={String(form.item_name || '')} onChange={e => onChange('item_name', e.target.value)} placeholder="Contoh: Jersey Wasit" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Jumlah *"><input required min="0.01" step="0.01" type="number" value={String(form.quantity ?? '')} onChange={e => onChange('quantity', e.target.value)} inputMode="decimal" /></Field><Field label="Satuan"><input value={String(form.unit || '')} onChange={e => onChange('unit', e.target.value)} placeholder="pcs" /></Field></div><Field label="Nama donatur"><input value={String(form.donor_name || '')} onChange={e => onChange('donor_name', e.target.value)} placeholder="Nama pemberi" /></Field></>}
    <Field label="Catatan"><textarea rows={3} value={String(form.notes || '')} onChange={e => onChange('notes', e.target.value)} placeholder="Keterangan tambahan (opsional)" /></Field>
  </div><div className="mt-6 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase">Batal</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[10px] font-black uppercase disabled:opacity-50">{saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Data'}</button></div></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400">{label}<div className="mt-1.5 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-slate-950 [&_input]:px-3 [&_input]:text-xs [&_input]:font-medium [&_input]:text-white [&_input]:outline-none [&_input]:focus:border-emerald-400/50 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:bg-slate-950 [&_textarea]:p-3 [&_textarea]:text-xs [&_textarea]:text-white [&_textarea]:outline-none [&_textarea]:focus:border-emerald-400/50">{children}</div></label>; }
