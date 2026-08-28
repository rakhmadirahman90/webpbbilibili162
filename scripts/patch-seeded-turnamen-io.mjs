import fs from 'node:fs';

const app = 'src/App.tsx';
let s = fs.readFileSync(app, 'utf8');

if (!s.includes("SeededTurnamenIO")) {
  const importMarker = "const SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));";
  if (s.includes(importMarker)) {
    s = s.replace(importMarker, `${importMarker}\nconst SeededTurnamenIO = lazy(() => import('./components/SeededTurnamenIO'));`);
  } else {
    console.warn('[patch-seeded-turnamen-io] SeededTurnamen import marker not found; leaving App.tsx unchanged');
  }
}

const oldRoute = '<Route path="seeded-turnamen" element={isAdmin ? <SeededTurnamen /> : <Navigate to="/admin/dashboard" replace />} />';
const newRoute = '<Route path="seeded-turnamen" element={isAdmin ? <SeededTurnamenIO /> : <Navigate to="/admin/dashboard" replace />} />';
if (s.includes(oldRoute)) s = s.replace(oldRoute, newRoute);
else if (!s.includes(newRoute)) console.warn('[patch-seeded-turnamen-io] seeded route marker not found; leaving route unchanged');

fs.writeFileSync(app, s, 'utf8');

const data = 'src/components/SeededTurnamen.tsx';
let d = fs.readFileSync(data, 'utf8');

const old = `  const loadPlayers = async () => {\n    setLoading(true);\n    setError('');\n    try {\n      const { data, error: queryError } = await supabase\n        .from('seeded_players')\n        .select('id,source_sheet,source_no,player_name,club_name,seeded_quality,division_level,tournament_qualification,region_status,validity_status,archive_category,gender,eligible_category')\n        .order('source_sheet', { ascending: true })\n        .order('source_no', { ascending: true });\n      if (queryError) throw queryError;\n      setPlayers((data || []) as Player[]);\n    } catch (err: any) {\n      console.error('Seeded database load failed:', err);\n      setError(err?.message || 'Data seeded belum dapat dimuat.');\n      setPlayers([]);\n    } finally {\n      setLoading(false);\n    }\n  };`;

const fresh = `  const loadPlayers = async () => {\n    setLoading(true);\n    setError('');\n    try {\n      const all: Player[] = [];\n      for (let from = 0; ; from += 1000) {\n        const { data, error: queryError } = await supabase.from('seeded_players')\n          .select('id,source_sheet,source_no,player_name,club_name,seeded_quality,division_level,tournament_qualification,region_status,validity_status,archive_category,gender,eligible_category')\n          .order('source_sheet', { ascending: true })\n          .order('source_no', { ascending: true })\n          .range(from, from + 999);\n        if (queryError) throw queryError;\n        const batch = (data || []) as Player[];\n        all.push(...batch);\n        if (batch.length < 1000) break;\n      }\n      setPlayers(all);\n    } catch (err: any) {\n      console.error('Seeded database load failed:', err);\n      setError(err?.message || 'Data seeded belum dapat dimuat dari Supabase.');\n      setPlayers([]);\n    } finally {\n      setLoading(false);\n    }\n  };`;

if (d.includes(old)) {
  d = d.replace(old, fresh);
} else if (!d.includes('for (let from = 0; ; from += 1000)')) {
  console.warn('[patch-seeded-turnamen-io] loadPlayers legacy marker not found; leaving pagination unchanged');
}

fs.writeFileSync(data, d, 'utf8');
console.log('[patch-seeded-turnamen-io] completed safely (idempotent)');
