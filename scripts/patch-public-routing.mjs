import fs from 'node:fs';

function patchFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  const original = code;
  let changed = 0;

  for (const { test, replace, label } of replacements) {
    if (test(code)) {
      const next = replace(code);
      if (next !== code) {
        code = next;
        changed += 1;
        console.log(`[patch-public-routing] ${path}: ${label}`);
      }
    }
  }

  if (code !== original) fs.writeFileSync(path, code);
  console.log(`[patch-public-routing] ${path}: ${changed} change(s)`);
}

const app = 'src/App.tsx';
patchFile(app, [
  {
    label: 'add prestasi/program to every full-page menu list',
    test: code => code.includes("'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'"),
    replace: code => code.replaceAll(
      "'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'",
      "'berita', 'news', 'prestasi', 'program', 'faq', 'sambutan', 'sambutan-ketua'"
    )
  },
  {
    label: 'add prestasi/program to initial full-page menu state',
    test: code => code.includes("'inventaris', 'berita', 'news', 'faq'") && !code.includes("'inventaris', 'berita', 'news', 'prestasi', 'program', 'faq'"),
    replace: code => code.replace(
      "'inventaris', 'berita', 'news', 'faq'",
      "'inventaris', 'berita', 'news', 'prestasi', 'program', 'faq'"
    )
  },
  {
    label: 'add public prestasi/program renderers',
    test: code => !code.includes("activeView === 'prestasi'") && code.includes("activeView === 'berita'") && code.includes("activeView === 'galeri'"),
    replace: code => code.replace(
      /(\s*\{\(activeView === 'berita' \|\| activeView === 'news'\) && <News \/>\})/,
      `$1\n                    {(activeView === 'prestasi') && <PublicPrestasi />}\n                    {(activeView === 'program') && <PublicProgram onNavigate={(path) => handleNavigate(path)} />}`
    )
  },
  {
    label: 'import active tournament gate',
    test: code => !code.includes("import PublicTournamentGate from './components/PublicTournamentGate';"),
    replace: code => code.replace(
      "import Navbar from './components/Navbar';",
      "import Navbar from './components/Navbar';\nimport PublicTournamentGate from './components/PublicTournamentGate';"
    )
  },
  {
    label: 'gate public tournament views',
    test: code => !code.includes('<PublicTournamentGate>'),
    replace: code => code
      .replace(/return <PublicPesertaTurnamen\/>;/g, 'return <PublicTournamentGate><PublicPesertaTurnamen /></PublicTournamentGate>;')
      .replace(/return <PublicSponsorship\/>;/g, 'return <PublicTournamentGate><PublicSponsorship /></PublicTournamentGate>;')
      .replace(/<Route path="\/pendaftaran-turnamen" element={<Suspense fallback={<ViewFallback\/>}><PendaftaranTurnamen\/><\/Suspense>}\/>/g, '<Route path="/pendaftaran-turnamen" element={<Suspense fallback={<ViewFallback />}><PublicTournamentGate><PendaftaranTurnamen /></PublicTournamentGate></Suspense>} />')
      .replace(/<Route path="\/pendaftaran\/seeded-peserta" element={<Suspense fallback={<ViewFallback\/>}><PublicSeededPeserta\/><\/Suspense>}\/>/g, '<Route path="/pendaftaran/seeded-peserta" element={<Suspense fallback={<ViewFallback />}><PublicTournamentGate><PublicSeededPeserta /></PublicTournamentGate></Suspense>} />')
      .replace(/<Route path="\/pendaftaran\/peserta-diterima" element={<Suspense fallback={<ViewFallback\/>}><PublicPesertaTurnamen\/><\/Suspense>}\/>/g, '<Route path="/pendaftaran/peserta-diterima" element={<Suspense fallback={<ViewFallback />}><PublicTournamentGate><PublicPesertaTurnamen /></PublicTournamentGate></Suspense>} />')
      .replace(/<Route path="\/sponsorship" element={<Suspense fallback={<ViewFallback\/>}><PublicSponsorship\/><\/Suspense>}\/>/g, '<Route path="/sponsorship" element={<Suspense fallback={<ViewFallback />}><PublicTournamentGate><PublicSponsorship /></PublicTournamentGate></Suspense>} />')
  }
]);

const navbar = 'src/components/Navbar.tsx';
patchFile(navbar, [
  {
    label: 'child submenu routing',
    test: code => !code.includes('// Submenu navigation must target the child path') && code.includes("if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');"),
    replace: code => code.replace(
      "    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');",
      `    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');
    // Submenu navigation must target the child path, not the parent dropdown.
    if (s) {
      if (['sejarah','visi-misi','visi','misi','fasilitas','struktur','struktur-organisasi','dokumen','dokumen-penting','prestasi','program','faq','berita','news'].includes(s)) return onNavigate(s);
      if (s === 'peringkat' || s === 'ranking' || s === 'rankings') return onNavigate('peringkat');
      if (s === 'register' || s === 'pendaftaran') return onNavigate('register');
      if (s === 'gallery' || s === 'galeri') return onNavigate('galeri');
      if (s === 'jadwal' || s.includes('jadwal')) return onNavigate('jadwal');
      if (s === 'contact' || s === 'kontak') return onNavigate('contact');
    }`
    )
  }
]);

const publicParticipants = 'src/components/PublicPesertaTurnamen.tsx';
patchFile(publicParticipants, [
  {
    label: 'filter accepted participants to active tournament',
    test: code => !code.includes('__PB_ACTIVE_TOURNAMENT_FILTER__'),
    replace: code => {
      const needle = "        const all: Registration[] = [];\n        for (let from = 0; ; from += 1000) {\n          const { data, error: e } = await supabase\n            .from('pendaftaran_turnamen')\n            .select('*')\n            .order('created_at', { ascending: true })\n            .range(from, from + 999);";
      const replacement = "        // __PB_ACTIVE_TOURNAMENT_FILTER__\n        const { data: activeTournament, error: activeTournamentError } = await supabase\n          .from('seeded_tournaments')\n          .select('id')\n          .eq('is_active', true)\n          .order('event_start', { ascending: false, nullsFirst: false })\n          .limit(1)\n          .maybeSingle();\n        if (activeTournamentError) throw activeTournamentError;\n        if (!activeTournament?.id) {\n          if (mountedRef.current) setRows([]);\n          return;\n        }\n        const all: Registration[] = [];\n        for (let from = 0; ; from += 1000) {\n          const { data, error: e } = await supabase\n            .from('pendaftaran_turnamen')\n            .select('*')\n            .eq('tournament_id', activeTournament.id)\n            .order('created_at', { ascending: true })\n            .range(from, from + 999);";
      if (!code.includes(needle)) return code;
      return code.replace(needle, replacement);
    }
  }
]);

console.log('[patch-public-routing] Public routing and active-tournament visibility patch completed safely.');
