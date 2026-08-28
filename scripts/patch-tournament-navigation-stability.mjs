import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

// Tournament registration is a public, interactive page. Do not suspend the
// whole public shell while its chunk is fetched; the desktop symptom is a
// visible flash/flicker when clicking the navbar item.
s = s.replace(
  "const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));",
  "import PendaftaranTurnamen from './components/PendaftaranTurnamen';"
);

// Keep the tournament path in every public full-page allowlist used by the
// URL synchronizer and initial state. This prevents a path -> activeView ->
// path feedback loop when navigation starts from the desktop dropdown.
s = s.replace(
  "'register', 'pendaftaran', 'pendaftaran/seeded-peserta'",
  "'register', 'pendaftaran', 'pendaftaran-turnamen', 'pendaftaran/seeded-peserta'"
);
s = s.replace(
  "'register','pendaftaran','pendaftaran/seeded-peserta'",
  "'register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta'"
);

// The route is rendered by activeView in the public shell. Avoid a second
// route implementation that would mount a competing page and flash the shell.
// The existing tournament render branch is retained as the single source.
fs.writeFileSync(path, s, 'utf8');
console.log('[patch-tournament-navigation-stability] eager tournament page + stable URL synchronization applied');
