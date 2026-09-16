import fs from 'node:fs';

const file = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
if (!fs.existsSync(file)) process.exit(0);
let s = fs.readFileSync(file, 'utf8');

if (!s.includes('ADMIN_REGISTRATION_SHOW_ALL_V1')) {
  s = s.replace("const [tournamentFilter, setTournamentFilter] = useState('current');", "const [tournamentFilter, setTournamentFilter] = useState('all');");
  s = s.replace("setPaymentStatus('Semua');setTournamentFilter('current')", "setPaymentStatus('Semua');setTournamentFilter('all')");
  s = s.replace('Tampilan default difokuskan pada turnamen yang sedang diselenggarakan.', 'Tampilkan seluruh data pendaftaran peserta dari database. Filter turnamen dapat digunakan bila diperlukan.');
  s = s.replace('// ADMIN_CURRENT_TOURNAMENT_FILTER_V1', '// ADMIN_CURRENT_TOURNAMENT_FILTER_V1\n// ADMIN_REGISTRATION_SHOW_ALL_V1');
  fs.writeFileSync(file, s, 'utf8');
  console.log('[patch-admin-registration-show-all] applied');
} else {
  console.log('[patch-admin-registration-show-all] already applied');
}
