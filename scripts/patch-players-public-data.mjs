import fs from 'node:fs';

const path = 'src/components/Players.tsx';
let source = fs.readFileSync(path, 'utf8');

// The public athlete menu must be database-authoritative. This build hook removes
// the legacy localDatabase fallback and hydrates the UI from the live Supabase
// tables pendaftaran + atlet_stats + rankings. It is intentionally idempotent.
source = source.replace("import { DEFAULT_PENDAFTARAN, DEFAULT_RANKINGS } from '../data/localDatabase';\n", '');

if (!source.includes("const [loadError, setLoadError] = useState<string | null>(null);")) {
  source = source.replace(
    "  const [isLoading, setIsLoading] = useState(true);\n",
    "  const [isLoading, setIsLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n",
  );
}

const startMarker = '  const fetchPlayersFromDB = useCallback(async () => {';
const endMarker = '  useEffect(() => {\n    fetchPlayersFromDB();';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start >= 0 && end > start && !source.includes('// PUBLIC DATABASE AUTHORITATIVE ATHLETE READ')) {
  const replacement = `  // PUBLIC DATABASE AUTHORITATIVE ATHLETE READ
  // Primary profile records: public.pendaftaran (66 live records at audit time).
  // Statistics and ranking records are joined by pendaftaran_id, then by name.
  // No DEFAULT_* or localStorage fallback is used for athlete data.
  const fetchPlayersFromDB = useCallback(async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      setIsLoading(true);
      setLoadError(null);

      const query = Promise.all([
        supabase.from('pendaftaran').select('*').order('nama', { ascending: true }),
        supabase.from('atlet_stats').select('*'),
        supabase.from('rankings').select('*'),
      ]);

      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Waktu tunggu data atlet dari Supabase habis.')), 12000);
      });

      const [pendaftaranRes, statsRes, rankingsRes] = await Promise.race([query, timeout]);
      if (pendaftaranRes.error) throw pendaftaranRes.error;
      if (statsRes.error) throw statsRes.error;
      if (rankingsRes.error) throw rankingsRes.error;

      const pendaftaranList = Array.isArray(pendaftaranRes.data) ? pendaftaranRes.data : [];
      const statsList = Array.isArray(statsRes.data) ? statsRes.data : [];
      const rankingsList = Array.isArray(rankingsRes.data) ? rankingsRes.data : [];

      const byId = (rows: any[]) => {
        const map = new Map<string, any>();
        rows.forEach((row) => {
          if (row?.pendaftaran_id) map.set(String(row.pendaftaran_id), row);
        });
        return map;
      };
      const byName = (rows: any[]) => {
        const map = new Map<string, any>();
        rows.forEach((row) => {
          const key = String(row?.player_name ?? '').trim().toLowerCase();
          if (key) map.set(key, row);
        });
        return map;
      };

      const statsById = byId(statsList);
      const statsByName = byName(statsList);
      const rankingsById = byId(rankingsList);
      const rankingsByName = byName(rankingsList);
      const playerMap = new Map<string, any>();

      const buildPlayer = (p: any, stat: any, rank: any) => {
        const name = String(p?.nama ?? rank?.player_name ?? stat?.player_name ?? '').trim();
        if (!name) return null;
        const basePoints = Number(stat?.points ?? rank?.poin ?? 0) || 0;
        const bonusPoints = Number(rank?.bonus ?? 0) || 0;
        const statsTotal = Number(stat?.total_points ?? 0) || 0;
        const rankingTotal = Number(rank?.total_points ?? 0) || 0;
        const displayPoints = Math.max(rankingTotal, statsTotal, basePoints + bonusPoints);
        return {
          id: p?.id ?? rank?.id ?? stat?.id ?? `athlete-${name.toLowerCase().replace(/\\s+/g, '-')}`,
          pendaftaran_id: p?.id ?? rank?.pendaftaran_id ?? stat?.pendaftaran_id ?? null,
          pendaftaran: {
            ...(p ?? {}),
            nama: name,
            foto_url: p?.foto_url || rank?.photo_url || null,
            kategori_atlet: p?.kategori_atlet || rank?.category || 'Senior',
            kategori: p?.kategori || rank?.category || p?.kategori_atlet || 'Senior',
            pengalaman: p?.pengalaman || stat?.bio || rank?.bio || '',
            status: p?.status || 'Active',
          },
          points: basePoints,
          total_points: Math.max(statsTotal, bonusPoints),
          display_points: displayPoints,
          rank: Number(stat?.rank ?? 0) || 0,
          seed: stat?.seed || rank?.seed || 'UNSEEDED',
          bio: stat?.bio || rank?.bio || p?.pengalaman || 'Profil atlet PB Bilibili 162.',
          status: p?.status || 'Active',
          last_match_at: stat?.last_match_at || null,
        };
      };

      // Every pendaftaran row is represented, even when stats/ranking is absent.
      pendaftaranList.forEach((p) => {
        const key = String(p?.id ?? '');
        const nameKey = String(p?.nama ?? '').trim().toLowerCase();
        const stat = statsById.get(key) || statsByName.get(nameKey);
        const rank = rankingsById.get(key) || rankingsByName.get(nameKey);
        const player = buildPlayer(p, stat, rank);
        if (player) playerMap.set(String(player.pendaftaran_id || player.id), player);
      });

      // Include valid stats/ranking records that have no matching pendaftaran row,
      // so the public menu never silently hides live database records.
      [...statsList, ...rankingsList].forEach((row) => {
        const id = String(row?.pendaftaran_id ?? '');
        const nameKey = String(row?.player_name ?? '').trim().toLowerCase();
        const existing = id ? playerMap.get(id) : undefined;
        if (existing) return;
        const p = {
          id: row?.pendaftaran_id || row?.id,
          nama: row?.player_name,
          foto_url: row?.photo_url || null,
          kategori_atlet: row?.category || 'Senior',
          kategori: row?.category || 'Senior',
          pengalaman: row?.bio || '',
          status: 'Active',
        };
        const stat = statsById.get(id) || statsByName.get(nameKey);
        const rank = rankingsById.get(id) || rankingsByName.get(nameKey);
        const player = buildPlayer(p, stat, rank);
        if (player) playerMap.set(String(player.pendaftaran_id || player.id), player);
      });

      const resultPlayers = Array.from(playerMap.values());
      setDbPlayers(resultPlayers);
      console.info('[Players] Supabase authoritative records:', {
        pendaftaran: pendaftaranList.length,
        atlet_stats: statsList.length,
        rankings: rankingsList.length,
        rendered: resultPlayers.length,
      });
    } catch (error: any) {
      console.error('[Players] Supabase read failed:', error);
      setDbPlayers([]);
      setLoadError(error?.message || 'Data atlet gagal dimuat dari Supabase.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, []);

`;
  source = source.slice(0, start) + replacement + source.slice(end);
}

// Realtime must also react to ranking changes, not only profile/stat changes.
source = source.replace(
  "      .on(\n        'postgres_changes',\n        { event: '*', table: 'pendaftaran', schema: 'public' },\n        () => fetchPlayersFromDB()\n      )\n      .subscribe();",
  "      .on(\n        'postgres_changes',\n        { event: '*', table: 'pendaftaran', schema: 'public' },\n        () => fetchPlayersFromDB()\n      )\n      .on(\n        'postgres_changes',\n        { event: '*', table: 'rankings', schema: 'public' },\n        () => fetchPlayersFromDB()\n      )\n      .subscribe();",
);

// Never leave a blank screen when Supabase returns an error.
if (!source.includes('id="players-load-error"')) {
  source = source.replace(
    '        {isLoading ? (',
    `        {!isLoading && loadError && (\n          <div id="players-load-error" className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">\n            <p className="font-black uppercase tracking-widest">Gagal memuat data atlet</p>\n            <p className="mt-1 text-red-200/80">{loadError}</p>\n            <button onClick={() => fetchPlayersFromDB()} className="mt-3 rounded-full bg-red-500/20 px-4 py-2 font-black uppercase tracking-wider hover:bg-red-500/30">Coba Lagi</button>\n          </div>\n        )}\n\n        {isLoading ? (`,
  );
}

fs.writeFileSync(path, source, 'utf8');
console.log('[patch-players-public-data] Players now reads live Supabase athlete data only.');
