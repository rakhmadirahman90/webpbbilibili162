import fs from 'node:fs';

const file = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let s = fs.readFileSync(file, 'utf8');
if (s.includes('ADMIN_CURRENT_TOURNAMENT_FILTER_V1')) {
  console.log('[patch-admin-current-tournament-filter] already applied');
  process.exit(0);
}

const helperNeedle = "const statusPay = (v?: string) => { const s = clean(v).toLowerCase(); return s.includes('terver') || s.includes('lunas') || s.includes('diterima') ? 'terverifikasi' : 'menunggu'; };";
const helperInsert = `${helperNeedle}\n\n// ADMIN_CURRENT_TOURNAMENT_FILTER_V1\nconst CURRENT_TOURNAMENT = { label: 'Bilibili 162 Cup I Tahun 2026', start: '2026-09-08', end: '2026-09-12' };\nconst tournamentName = (r: Registration) => clean(r.nama_turnamen ?? r.nama_event ?? r.tournament_name ?? r.event_name ?? r.turnamen_nama ?? r.turnamen);\nconst tournamentId = (r: Registration) => clean(r.tournament_id ?? r.turnamen_id ?? r.event_id ?? r.eventId);\nconst isCurrentTournament = (r: Registration) => {\n  const name = tournamentName(r).toLowerCase();\n  if (name) return name.includes('bilibili 162 cup i') || (name.includes('bilibili') && name.includes('2026'));\n  const d = clean(r.created_at).slice(0, 10);\n  return d >= CURRENT_TOURNAMENT.start && d <= CURRENT_TOURNAMENT.end;\n};`;
if (!s.includes(helperNeedle)) throw new Error('statusPay helper not found');
s = s.replace(helperNeedle, helperInsert);

const stateNeedle = "  const [paymentStatus, setPaymentStatus] = useState('Semua');\n  const [page, setPage] = useState(1);";
const stateInsert = "  const [paymentStatus, setPaymentStatus] = useState('Semua');\n  const [tournamentFilter, setTournamentFilter] = useState('current');\n  const [page, setPage] = useState(1);";
if (!s.includes(stateNeedle)) throw new Error('state needle not found');
s = s.replace(stateNeedle, stateInsert);

const filteredNeedle = "      return (!q || hay.includes(q)) && (category === 'Semua' || clean(r.kategori) === category) && (registrationStatus === 'Semua' || statusReg(r.status_pendaftaran) === registrationStatus) && (paymentStatus === 'Semua' || statusPay(r.status_pembayaran) === paymentStatus);";
const filteredReplace = "      const tournamentMatch = tournamentFilter === 'all' ? true : tournamentFilter === 'current' ? isCurrentTournament(r) : tournamentName(r) === tournamentFilter || tournamentId(r) === tournamentFilter;\n      return (!q || hay.includes(q)) && tournamentMatch && (category === 'Semua' || clean(r.kategori) === category) && (registrationStatus === 'Semua' || statusReg(r.status_pendaftaran) === registrationStatus) && (paymentStatus === 'Semua' || statusPay(r.status_pembayaran) === paymentStatus);";
if (!s.includes(filteredNeedle)) throw new Error('filtered expression not found');
s = s.replace(filteredNeedle, filteredReplace);

const depNeedle = "  useEffect(() => setPage(1), [query, category, registrationStatus, paymentStatus]);";
const depReplace = "  useEffect(() => setPage(1), [query, category, registrationStatus, paymentStatus, tournamentFilter]);";
if (!s.includes(depNeedle)) throw new Error('pagination deps not found');
s = s.replace(depNeedle, depReplace);

const resetNeedle = "onClick={()=>{setQuery('');setCategory('Semua');setRegistrationStatus('Semua');setPaymentStatus('Semua')}}";
const resetReplace = "onClick={()=>{setQuery('');setCategory('Semua');setRegistrationStatus('Semua');setPaymentStatus('Semua');setTournamentFilter('current')}}";
if (!s.includes(resetNeedle)) throw new Error('reset button not found');
s = s.replace(resetNeedle, resetReplace);

const filterButtonNeedle = "<button onClick={()=>{setQuery('');setCategory('Semua');setRegistrationStatus('Semua');setPaymentStatus('Semua');setTournamentFilter('current')}} className=";
const filterControls = "<label className=\"lg:col-span-2\"><span className=\"mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500\">Turnamen</span><select value={tournamentFilter} onChange={e=>setTournamentFilter(e.target.value)} className=\"min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-500\"><option value=\"current\">Turnamen Saat Ini — {CURRENT_TOURNAMENT.label}</option><option value=\"all\">Semua Data Turnamen</option>{Array.from(new Set(rows.map(r=>tournamentName(r)).filter(Boolean))).map(v=><option key={v} value={v}>{v}</option>)}</select></label>";
if (!s.includes(filterButtonNeedle)) throw new Error('filter button anchor not found');
s = s.replace(filterButtonNeedle, filterControls + filterButtonNeedle);

const statsNeedle = "  const stats = useMemo(() => ({ total: rows.length, pending: rows.filter(r => statusReg(r.status_pendaftaran) === 'pending').length, accepted: rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length, rejected: rows.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length, paid: rows.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi').length }), [rows]);";
const statsReplace = "  const stats = useMemo(() => ({ total: filtered.length, pending: filtered.filter(r => statusReg(r.status_pendaftaran) === 'pending').length, accepted: filtered.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length, rejected: filtered.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length, paid: filtered.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi').length }), [filtered]);";
if (!s.includes(statsNeedle)) throw new Error('stats block not found');
s = s.replace(statsNeedle, statsReplace);

const headerNeedle = "<p className=\"mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm\">Kelola data pasangan, foto, KTP, NIK, dan bukti pembayaran secara lengkap.</p>";
const headerReplace = "<p className=\"mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm\">Kelola data pasangan, foto, KTP, NIK, dan bukti pembayaran secara lengkap. Tampilan default difokuskan pada turnamen yang sedang diselenggarakan.</p>";
if (!s.includes(headerNeedle)) throw new Error('header text not found');
s = s.replace(headerNeedle, headerReplace);

fs.writeFileSync(file, s);
console.log('[patch-admin-current-tournament-filter] applied');
