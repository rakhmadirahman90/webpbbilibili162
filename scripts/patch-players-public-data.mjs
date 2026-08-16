import fs from 'node:fs';

const path = 'src/components/Players.tsx';
let source = fs.readFileSync(path, 'utf8');

// Safe, idempotent athlete-data migration. Do not generate source code from a
// nested template literal here: that caused the previous Vercel build failure.
source = source.replace("import { DEFAULT_PENDAFTARAN, DEFAULT_RANKINGS } from '../data/localDatabase';\n", '');

if (!source.includes("const [loadError, setLoadError] = useState<string | null>(null);")) {
  source = source.replace(
    "  const [isLoading, setIsLoading] = useState(true);\n",
    "  const [isLoading, setIsLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n",
  );
}

// Remove legacy local-data fallback blocks while preserving the live Supabase read.
source = source.replace(
  /      if \(resultPlayers\.length > 0\) \{[\s\S]*?      \} else \{[\s\S]*?        setDbPlayers\(localList\);\n      \}\n/,
  "      setDbPlayers(resultPlayers);\n",
);
source = source.replace(
  /    \} catch \(err\) \{[\s\S]*?      setDbPlayers\(localList\);\n    \} finally \{/,
  "    } catch (err: any) {\n      console.error('[Players] Supabase read failed:', err);\n      setDbPlayers([]);\n      setLoadError(err?.message || 'Data atlet gagal dimuat dari Supabase.');\n    } finally {",
);

// Use the authoritative calculated value when available; avoid double-counting totals.
source = source.replace(
  "const calculatedPoints = (Number(p.points) || 0) + (Number(p.total_points) || 0);",
  "const calculatedPoints = Number(p.display_points ?? ((Number(p.points) || 0) + (Number(p.total_points) || 0)));",
);

// Ranking changes must refresh the public athlete cards too.
const rankingSubscription = "      .on(\n        'postgres_changes',\n        { event: '*', table: 'rankings', schema: 'public' },\n        () => fetchPlayersFromDB()\n      )\n      .subscribe();";
if (!source.includes("table: 'rankings'")) {
  source = source.replace("      .subscribe();", rankingSubscription);
}

// Show a recoverable error instead of an endless/blank state.
if (!source.includes('id="players-load-error"')) {
  const marker = "        {isLoading ? (";
  const errorBlock = [
    "        {!isLoading && loadError && (",
    "          <div id=\"players-load-error\" className=\"mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200\">",
    "            <p className=\"font-black uppercase tracking-widest\">Gagal memuat data atlet</p>",
    "            <p className=\"mt-1 text-red-200/80\">{loadError}</p>",
    "            <button onClick={() => fetchPlayersFromDB()} className=\"mt-3 rounded-full bg-red-500/20 px-4 py-2 font-black uppercase tracking-wider hover:bg-red-500/30\">Coba Lagi</button>",
    "          </div>",
    "        )}",
    "",
    marker,
  ].join('\n');
  source = source.replace(marker, errorBlock);
}

fs.writeFileSync(path, source, 'utf8');
console.log('[patch-players-public-data] Safe athlete Supabase migration applied.');
