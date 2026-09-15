import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Edit3, Filter, Plus, RefreshCw, Save, ShieldCheck, Trash2, Trophy, Users, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type Tournament = { id: number; name: string; event_start: string | null; event_end: string | null; is_active: boolean; status: string };
type SeededRule = { level1: string; level2: string };
type Category = {
  id: string;
  tournament_id: number;
  code: string;
  name: string;
  short_name: string | null;
  event_type: string;
  gender: string;
  age_group: string | null;
  skill_class: string | null;
  seeded_mode: 'open' | 'single' | 'pair';
  allowed_seeded_levels: string[];
  seeded_pair_rules: SeededRule[];
  max_entries: number;
  entry_fee: number;
  prize_pool: number;
  match_format: string;
  best_of: number;
  points_per_game: number;
  registration_open: boolean;
  is_active: boolean;
  sort_order: number;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = Omit<Category, 'id' | 'created_at' | 'updated_at'>;

const LEVELS = ['A', 'B', 'C+', 'C-', 'C', 'D'];
const EVENT_TYPES = ['Tunggal', 'Ganda', 'Beregu', 'Campuran', 'Lainnya'];
const GENDERS = ['Putra', 'Putri', 'Campuran', 'Terbuka'];
const MODES = [
  { value: 'open', label: 'Terbuka', help: 'Tidak menggunakan pembatasan seeded.' },
  { value: 'single', label: 'Seeded tertentu', help: 'Pemain wajib memiliki salah satu level seeded yang dipilih.' },
  { value: 'pair', label: 'Kombinasi pasangan', help: 'Pasangan wajib mengikuti kombinasi level seeded yang dibuat admin.' },
] as const;

const emptyForm = (tournamentId: number): FormState => ({
  tournament_id: tournamentId,
  code: '', name: '', short_name: '', event_type: 'Ganda', gender: 'Putra', age_group: 'Dewasa', skill_class: '',
  seeded_mode: 'open', allowed_seeded_levels: [], seeded_pair_rules: [], max_entries: 32, entry_fee: 0, prize_pool: 0,
  match_format: 'Best of 3 x 21 poin', best_of: 3, points_per_game: 21, registration_open: true, is_active: true,
  sort_order: 10, description: '', notes: ''
});

const clean = (v: unknown) => String(v ?? '').trim();
const money = (v: unknown) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v || 0));
const dateId = (v?: string | null) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

function parseRules(value: unknown): SeededRule[] {
  if (!Array.isArray(value)) return [];
  return value.map((x: any) => ({ level1: clean(x?.level1), level2: clean(x?.level2) })).filter(x => x.level1 && x.level2);
}

export default function AdminKategoriPertandingan() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(0));
  const [query, setQuery] = useState('');
  const [filterActive, setFilterActive] = useState('Semua');
  const [filterSeeded, setFilterSeeded] = useState('Semua');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        supabase.from('seeded_tournaments').select('id,name,event_start,event_end,is_active,status').order('is_active', { ascending: false }).order('event_start', { ascending: false, nullsFirst: false }),
        supabase.from('tournament_categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })
      ]);
      if (t.error) throw t.error;
      if (c.error) throw c.error;
      const ts = (t.data || []) as Tournament[];
      setTournaments(ts);
      setCategories((c.data || []).map((x: any) => ({ ...x, allowed_seeded_levels: Array.isArray(x.allowed_seeded_levels) ? x.allowed_seeded_levels : [], seeded_pair_rules: parseRules(x.seeded_pair_rules) })) as Category[]);
      setSelectedTournamentId(prev => prev && ts.some(x => x.id === prev) ? prev : ts.find(x => x.is_active)?.id ?? ts[0]?.id ?? null);
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Data kategori gagal dimuat', text: e?.message || 'Periksa tabel tournament_categories dan koneksi database.', confirmButtonColor: '#2563eb' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('admin_tournament_categories_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_categories' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seeded_tournaments' }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const selectedTournament = useMemo(() => tournaments.find(t => t.id === selectedTournamentId) || null, [tournaments, selectedTournamentId]);
  const scoped = useMemo(() => categories.filter(c => c.tournament_id === selectedTournamentId), [categories, selectedTournamentId]);
  const filtered = useMemo(() => {
    const q = clean(query).toLocaleLowerCase('id-ID');
    return scoped.filter(c => {
      const hay = [c.code, c.name, c.short_name, c.event_type, c.gender, c.age_group, c.skill_class, c.description].map(clean).join(' ').toLocaleLowerCase('id-ID');
      return (!q || hay.includes(q)) && (filterActive === 'Semua' || (filterActive === 'Aktif' ? c.is_active : !c.is_active)) && (filterSeeded === 'Semua' || (filterSeeded === 'Terbuka' ? c.seeded_mode === 'open' : c.seeded_mode !== 'open'));
    });
  }, [scoped, query, filterActive, filterSeeded]);

  const stats = useMemo(() => ({ total: scoped.length, active: scoped.filter(c => c.is_active).length, seeded: scoped.filter(c => c.seeded_mode !== 'open').length, open: scoped.filter(c => c.registration_open).length }), [scoped]);
  const seededUsed = useMemo(() => Array.from(new Set(scoped.flatMap(c => c.allowed_seeded_levels).concat(scoped.flatMap(c => c.seeded_pair_rules.flatMap(r => [r.level1, r.level2]))))).filter(Boolean), [scoped]);

  const openCreate = () => {
    if (!selectedTournamentId) return Swal.fire({ icon: 'info', title: 'Pilih turnamen terlebih dahulu' });
    setEditing(null); setForm(emptyForm(selectedTournamentId)); setFormOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      tournament_id: c.tournament_id, code: c.code || '', name: c.name || '', short_name: c.short_name || '', event_type: c.event_type || 'Ganda', gender: c.gender || 'Putra', age_group: c.age_group || '', skill_class: c.skill_class || '',
      seeded_mode: c.seeded_mode || 'open', allowed_seeded_levels: [...(c.allowed_seeded_levels || [])], seeded_pair_rules: parseRules(c.seeded_pair_rules), max_entries: Number(c.max_entries || 1), entry_fee: Number(c.entry_fee || 0), prize_pool: Number(c.prize_pool || 0), match_format: c.match_format || 'Best of 3 x 21 poin', best_of: Number(c.best_of || 3), points_per_game: Number(c.points_per_game || 21), registration_open: !!c.registration_open, is_active: !!c.is_active, sort_order: Number(c.sort_order || 0), description: c.description || '', notes: c.notes || ''
    });
    setFormOpen(true);
  };
  const closeForm = () => { if (saving) return; setFormOpen(false); setEditing(null); };
  const set = (key: keyof FormState, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleLevel = (level: string) => set('allowed_seeded_levels', form.allowed_seeded_levels.includes(level) ? form.allowed_seeded_levels.filter(x => x !== level) : [...form.allowed_seeded_levels, level]);
  const addRule = () => set('seeded_pair_rules', [...form.seeded_pair_rules, { level1: LEVELS[0], level2: LEVELS[0] }]);
  const updateRule = (index: number, key: keyof SeededRule, value: string) => set('seeded_pair_rules', form.seeded_pair_rules.map((r, i) => i === index ? { ...r, [key]: value } : r));
  const removeRule = (index: number) => set('seeded_pair_rules', form.seeded_pair_rules.filter((_, i) => i !== index));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = clean(form.code).toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    const name = clean(form.name);
    if (!form.tournament_id) return Swal.fire({ icon: 'warning', title: 'Turnamen wajib dipilih' });
    if (!name) return Swal.fire({ icon: 'warning', title: 'Nama kategori wajib diisi' });
    if (!code) return Swal.fire({ icon: 'warning', title: 'Kode kategori wajib diisi', text: 'Gunakan kode singkat dan unik dalam satu turnamen.' });
    if (form.seeded_mode === 'single' && form.allowed_seeded_levels.length === 0) return Swal.fire({ icon: 'warning', title: 'Pilih minimal satu level seeded' });
    if (form.seeded_mode === 'pair' && form.seeded_pair_rules.length === 0) return Swal.fire({ icon: 'warning', title: 'Tambahkan minimal satu kombinasi seeded' });
    const duplicateRule = new Set(form.seeded_pair_rules.map(r => [r.level1, r.level2].sort().join('::'))).size !== form.seeded_pair_rules.length;
    if (duplicateRule) return Swal.fire({ icon: 'warning', title: 'Kombinasi seeded ganda', text: 'Hapus kombinasi yang sama agar aturan tidak ambigu.' });

    const payload = {
      tournament_id: form.tournament_id, code, name, short_name: clean(form.short_name) || null, event_type: form.event_type, gender: form.gender, age_group: clean(form.age_group) || null, skill_class: clean(form.skill_class) || null,
      seeded_mode: form.seeded_mode, allowed_seeded_levels: form.seeded_mode === 'single' ? form.allowed_seeded_levels : [], seeded_pair_rules: form.seeded_mode === 'pair' ? form.seeded_pair_rules : [], max_entries: Math.max(1, Math.floor(Number(form.max_entries) || 1)), entry_fee: Math.max(0, Number(form.entry_fee) || 0), prize_pool: Math.max(0, Number(form.prize_pool) || 0),
      match_format: clean(form.match_format) || `Best of ${form.best_of} x ${form.points_per_game} poin`, best_of: Number(form.best_of) || 3, points_per_game: Math.max(1, Number(form.points_per_game) || 21), registration_open: !!form.registration_open, is_active: !!form.is_active, sort_order: Math.floor(Number(form.sort_order) || 0), description: clean(form.description) || null, notes: clean(form.notes) || null
    };

    setSaving(true);
    try {
      const result = editing ? await supabase.from('tournament_categories').update(payload).eq('id', editing.id) : await supabase.from('tournament_categories').insert(payload);
      if (result.error) throw result.error;
      closeForm(); await load();
      await Swal.fire({ icon: 'success', title: editing ? 'Kategori diperbarui' : 'Kategori ditambahkan', text: 'Konfigurasi kategori tersimpan dan siap digunakan.', timer: 1300, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal menyimpan kategori', text: e?.message || 'Database menolak perubahan.' });
    } finally { setSaving(false); }
  };

  const deleteCategory = async (c: Category) => {
    const linked = await supabase.from('pendaftaran_turnamen').select('id', { count: 'exact', head: true }).eq('tournament_category_id', c.id);
    if (linked.error && !String(linked.error.message).toLowerCase().includes('column')) console.warn(linked.error);
    const count = Number(linked.count || 0);
    const result = await Swal.fire({ icon: 'warning', title: 'Hapus kategori?', html: `<b>${c.name.replace(/</g, '&lt;')}</b><br><span style="opacity:.7">${count ? `${count} pendaftaran terhubung akan tetap ada, tetapi referensi kategori dikosongkan.` : 'Belum ada pendaftaran yang terhubung.'}</span>`, showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('tournament_categories').delete().eq('id', c.id);
      if (error) throw error;
      await load();
      Swal.fire({ icon: 'success', title: 'Kategori dihapus', timer: 1000, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Kategori tidak dapat dihapus', text: e?.message || 'Periksa relasi data.' }); }
  };

  const quickPreset = (kind: 'ajat' | 'lokal') => {
    if (!selectedTournamentId) return;
    if (kind === 'ajat') {
      setForm({ ...emptyForm(selectedTournamentId), code: 'AD-BC-C-C-AJATAPPARENG', name: 'Ganda Putra AD/BC-/C+C Ajatappareng', short_name: 'AD/BC-/C+C Ajatappareng', event_type: 'Ganda', gender: 'Putra', age_group: 'Dewasa', skill_class: 'A/B/C+/C-/C/D', seeded_mode: 'pair', allowed_seeded_levels: LEVELS, seeded_pair_rules: [{level1:'A',level2:'D'},{level1:'B',level2:'C-'},{level1:'B',level2:'D'},{level1:'C+',level2:'C'},{level1:'C+',level2:'C-'},{level1:'C',level2:'C'},{level1:'C',level2:'D'}], max_entries: 64, entry_fee: 150000, prize_pool: 0, match_format: 'Best of 3 x 21 poin', best_of: 3, points_per_game: 21, sort_order: 10 });
    } else {
      setForm({ ...emptyForm(selectedTournamentId), code: 'CC-LOKAL-PAREPARE', name: 'Ganda Putra CC Lokal Parepare', short_name: 'CC Lokal Parepare', event_type: 'Ganda', gender: 'Putra', age_group: 'Dewasa', skill_class: 'C-/D', seeded_mode: 'pair', allowed_seeded_levels: ['C-', 'D'], seeded_pair_rules: [{level1:'C-',level2:'C-'},{level1:'C-',level2:'D'},{level1:'D',level2:'D'}], max_entries: 128, entry_fee: 150000, prize_pool: 0, match_format: 'Best of 3 x 21 poin', best_of: 3, points_per_game: 21, sort_order: 20 });
    }
  };

  const input = (key: keyof FormState, label: string, type = 'text') => <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><input type={type} value={String(form[key] ?? '')} onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>;
  const select = (key: keyof FormState, label: string, options: string[]) => <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><select value={String(form[key] ?? '')} onChange={e => set(key, e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500">{options.map(o => <option key={o} value={o}>{o}</option>)}</select></label>;

  return <div className="min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="overflow-hidden rounded-[28px] bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-amber-200"><Trophy size={14}/> Pusat Turnamen • Kategori Pertandingan</div><h1 className="text-2xl font-black tracking-tight sm:text-4xl">Atur Kategori Pertandingan</h1><p className="mt-2 max-w-4xl text-xs leading-5 text-slate-300 sm:text-sm">Admin dapat membuat nama kategori sendiri, mengatur jenis pertandingan, gender, kelas, kuota, biaya, format skor, serta aturan seeded tanpa mengubah kode program.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black uppercase"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Muat Ulang</button></div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pilih Event</p><h2 className="text-base font-black">Turnamen</h2></div><Trophy size={18} className="text-amber-500"/></div><select value={selectedTournamentId ?? ''} onChange={e => setSelectedTournamentId(Number(e.target.value) || null)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black outline-none focus:border-blue-500"><option value="">Pilih turnamen...</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_active ? ' • AKTIF' : ''}</option>)}</select>{selectedTournament && <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-black text-slate-800">{selectedTournament.name}</p><p className="mt-1 text-[10px] text-slate-500">{dateId(selectedTournament.event_start)} — {dateId(selectedTournament.event_end)} • {selectedTournament.status}</p>{selectedTournament.is_active && <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Event Aktif</span>}</div>}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Kategori" value={stats.total} icon={<Filter size={16}/>} /><Stat label="Aktif" value={stats.active} icon={<ShieldCheck size={16}/>} /><Stat label="Pakai Seeded" value={stats.seeded} icon={<Trophy size={16}/>} /><Stat label="Buka Pendaftaran" value={stats.open} icon={<Users size={16}/>} /></div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-sm font-black text-blue-950">Konfigurasi berbasis seeded</h2><p className="mt-1 text-xs leading-5 text-blue-900/70">Gunakan <b>Seeded tertentu</b> untuk membatasi level pemain, atau <b>Kombinasi pasangan</b> untuk aturan seperti A+D, B+C-, C-+D, dan kombinasi lain yang ditentukan admin.</p>{seededUsed.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{seededUsed.map(x => <span key={x} className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-blue-700 shadow-sm">Seeded {x}</span>)}</div>}</div><div className="flex flex-wrap gap-2"><button onClick={() => { if (!selectedTournamentId) return Swal.fire({icon:'info',title:'Pilih turnamen terlebih dahulu'}); setEditing(null); quickPreset('ajat'); setFormOpen(true); }} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-[9px] font-black uppercase text-blue-800">Preset AD/BC-/C+C</button><button onClick={() => { if (!selectedTournamentId) return Swal.fire({icon:'info',title:'Pilih turnamen terlebih dahulu'}); setEditing(null); quickPreset('lokal'); setFormOpen(true); }} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-[9px] font-black uppercase text-blue-800">Preset CC Lokal</button></div></div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-black">Daftar Kategori</h2><p className="text-xs text-slate-500">Kategori diatur per event. Perubahan tidak memengaruhi kategori event lain.</p></div><button onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase text-white shadow-lg shadow-blue-600/20"><Plus size={16}/> Tambah Kategori</button></div><div className="mt-4 grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_180px]"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, kode, kelas, gender..." className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"/><select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold"><option>Semua</option><option>Aktif</option><option>Nonaktif</option></select><select value={filterSeeded} onChange={e => setFilterSeeded(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold"><option>Semua</option><option>Terbuka</option><option>Seeded</option></select></div>
        {!selectedTournamentId ? <div className="py-14 text-center text-sm text-slate-400">Pilih event turnamen untuk melihat kategori.</div> : filtered.length === 0 ? <div className="py-14 text-center"><p className="text-sm font-bold text-slate-500">Belum ada kategori yang sesuai.</p><button onClick={openCreate} className="mt-3 text-xs font-black text-blue-600">+ Buat kategori pertama</button></div> : <div className="mt-4 grid gap-3 xl:grid-cols-2">{filtered.map(c => <article key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-slate-900 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white">{c.code}</span><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${c.registration_open ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{c.registration_open ? 'Pendaftaran Buka' : 'Pendaftaran Tutup'}</span></div><h3 className="mt-2 text-base font-black leading-6 text-slate-900">{c.name}</h3><p className="mt-1 text-[10px] text-slate-500">{c.event_type} • {c.gender}{c.age_group ? ` • ${c.age_group}` : ''}{c.skill_class ? ` • ${c.skill_class}` : ''}</p></div><div className="flex shrink-0 gap-1"><button onClick={() => openEdit(c)} title="Edit" className="rounded-lg border border-slate-200 bg-white p-2 text-blue-600"><Edit3 size={15}/></button><button onClick={() => void deleteCategory(c)} title="Hapus" className="rounded-lg border border-slate-200 bg-white p-2 text-red-500"><Trash2 size={15}/></button></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Mini label="Kuota" value={`${c.max_entries}`} /><Mini label="Biaya" value={money(c.entry_fee)} /><Mini label="Format" value={c.match_format} /><Mini label="Seeded" value={c.seeded_mode === 'open' ? 'Terbuka' : c.seeded_mode === 'single' ? c.allowed_seeded_levels.join(', ') : `${c.seeded_pair_rules.length} kombinasi`} /></div>{c.seeded_mode === 'pair' && c.seeded_pair_rules.length > 0 && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-blue-700">Aturan pasangan seeded</p><div className="mt-2 flex flex-wrap gap-1.5">{c.seeded_pair_rules.map((r, i) => <span key={`${r.level1}-${r.level2}-${i}`} className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-blue-900 shadow-sm">{r.level1} + {r.level2}</span>)}</div></div>} {c.description && <p className="mt-3 text-xs leading-5 text-slate-500">{c.description}</p>}</article>)}</div>}
      </section>
    </div>

    {formOpen && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto my-3 w-full max-w-5xl rounded-3xl bg-white shadow-2xl sm:my-8"><div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">{editing ? 'Edit kategori pertandingan' : 'Kategori pertandingan baru'}</p><h2 className="text-lg font-black sm:text-2xl">{editing ? form.name : 'Atur kategori secara lengkap'}</h2></div><button onClick={closeForm} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={18}/></button></div><form onSubmit={save} className="space-y-6 p-4 sm:p-6">
      <section><SectionTitle title="1. Penamaan & identitas kategori"/><div className="grid gap-4 md:grid-cols-2">{input('name','Nama kategori yang ditampilkan','text')}{input('code','Kode kategori','text')}{input('short_name','Nama singkat','text')}{select('event_type','Jenis pertandingan',EVENT_TYPES)}{select('gender','Gender',GENDERS)}{input('age_group','Kelompok usia / umur','text')}{input('skill_class','Kelas / level tampilan','text')}{input('sort_order','Urutan tampil','number')}</div></section>
      <section><SectionTitle title="2. Aturan seeded"/><div className="grid gap-3 md:grid-cols-3">{MODES.map(m => <button key={m.value} type="button" onClick={() => set('seeded_mode', m.value)} className={`rounded-2xl border p-4 text-left transition ${form.seeded_mode === m.value ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-blue-200'}`}><p className="text-sm font-black">{m.label}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{m.help}</p></button>)}</div>{form.seeded_mode === 'single' && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black">Level seeded yang diizinkan</p><div className="mt-3 flex flex-wrap gap-2">{LEVELS.map(level => <button key={level} type="button" onClick={() => toggleLevel(level)} className={`rounded-xl border px-4 py-2 text-xs font-black ${form.allowed_seeded_levels.includes(level) ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Seeded {level}</button>)}</div></div>}{form.seeded_mode === 'pair' && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black">Kombinasi level pasangan</p><p className="mt-1 text-[10px] text-slate-500">Admin bebas membuat aturan kombinasi. Urutan A+B dianggap sama dengan B+A.</p></div><button type="button" onClick={addRule} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[9px] font-black uppercase text-white"><Plus size={14}/> Tambah aturan</button></div><div className="mt-3 space-y-2">{form.seeded_pair_rules.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Belum ada kombinasi. Tambahkan aturan di atas.</p>}{form.seeded_pair_rules.map((r, i) => <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"><select value={r.level1} onChange={e => updateRule(i,'level1',e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black"><option value="">Level 1</option>{LEVELS.map(x => <option key={x}>{x}</option>)}</select><span className="text-xs font-black text-slate-400">+</span><select value={r.level2} onChange={e => updateRule(i,'level2',e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black"><option value="">Level 2</option>{LEVELS.map(x => <option key={x}>{x}</option>)}</select><button type="button" onClick={() => removeRule(i)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-500"><Trash2 size={15}/></button></div>)}</div></div>}</section>
      <section><SectionTitle title="3. Kuota, biaya & hadiah"/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{input('max_entries','Kuota entry','number')}{input('entry_fee','Biaya pendaftaran (Rp)','number')}{input('prize_pool','Total hadiah (Rp)','number')}{input('points_per_game','Poin per game','number')}</div></section>
      <section><SectionTitle title="4. Sistem pertandingan"/><div className="grid gap-4 md:grid-cols-3"><label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Best of</span><select value={String(form.best_of)} onChange={e => set('best_of', Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><option value="1">1 game</option><option value="3">Best of 3</option><option value="5">Best of 5</option></select></label>{input('match_format','Nama format pertandingan')}{input('points_per_game','Poin per game','number')}</div></section>
      <section><SectionTitle title="5. Status & informasi"/><div className="grid gap-4 md:grid-cols-2"><label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><span><b className="block text-sm">Kategori aktif</b><small className="text-xs text-slate-500">Tampilkan kategori pada event ini.</small></span><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="h-5 w-5 accent-blue-600"/></label><label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><span><b className="block text-sm">Pendaftaran dibuka</b><small className="text-xs text-slate-500">Kategori dapat dipilih peserta publik.</small></span><input type="checkbox" checked={form.registration_open} onChange={e => set('registration_open', e.target.checked)} className="h-5 w-5 accent-blue-600"/></label></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Deskripsi kategori</span><textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"/></label><label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Catatan internal admin</span><textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"/></label></div></section>
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-[10px] leading-4 text-slate-500">Kategori ini tersimpan terpisah per event dan dapat diubah kapan saja oleh admin.</p><div className="flex gap-2"><button type="button" onClick={closeForm} className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-black uppercase text-slate-600">Batal</button><button disabled={saving} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black uppercase text-white disabled:opacity-50"><Save size={15}/>{saving ? 'Menyimpan...' : 'Simpan Kategori'}</button></div></div>
    </form></div></div>}
  </div>;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span><span className="text-blue-600">{icon}</span></div><p className="mt-2 text-2xl font-black">{value}</p></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-2.5"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-[10px] font-black text-slate-800" title={value}>{value}</p></div>; }
function SectionTitle({ title }: { title: string }) { return <div className="mb-4 flex items-center gap-2"><div className="h-6 w-1 rounded-full bg-blue-600"/><h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3></div>; }
