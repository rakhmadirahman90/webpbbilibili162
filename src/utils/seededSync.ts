import { supabase } from '../supabase';

export const SEED_OPTIONS = ['A','B','C+','C','C-','D','UNSEEDED'] as const;
export type SeedValue = typeof SEED_OPTIONS[number];

export const SEED_LABELS: Record<SeedValue,string> = {
  A: 'Seed A',
  B: 'Seed B',
  'C+': 'Seed C+',
  C: 'Seed C',
  'C-': 'Seed C-',
  D: 'Seed D',
  UNSEEDED: 'Non Seeded',
};

export const SEED_RANK: Record<string,number> = {
  A: 6, B: 5, 'C+': 4, C: 3, 'C-': 2, D: 1,
};

export function normalizeSeed(value: unknown): SeedValue {
  const v = String(value ?? '').trim().toUpperCase().replace(/^SEED\s+/, '');
  return (SEED_OPTIONS as readonly string[]).includes(v) ? v as SeedValue : 'UNSEEDED';
}

export function seedLabel(value: unknown): string {
  return SEED_LABELS[normalizeSeed(value)];
}

export async function getLatestTournamentSeedMap() {
  const { data: tournaments, error: tournamentError } = await supabase
    .from('seeded_tournaments')
    .select('id,event_start,created_at')
    .order('event_start', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (tournamentError) throw tournamentError;

  const tournamentId = tournaments?.[0]?.id;
  if (!tournamentId) return new Map<string, SeedValue>();

  const { data: rows, error } = await supabase
    .from('seeded_players')
    .select('player_name,seeded_quality')
    .eq('tournament_id', tournamentId);
  if (error) throw error;

  const map = new Map<string, SeedValue>();
  for (const row of rows || []) {
    const name = String(row.player_name || '').trim().toLocaleLowerCase('id-ID');
    if (!name) continue;
    const seed = normalizeSeed(row.seeded_quality);
    if (seed === 'UNSEEDED') continue;
    const previous = map.get(name);
    if (!previous || SEED_RANK[seed] > SEED_RANK[previous]) map.set(name, seed);
  }
  return map;
}

/**
 * Menjaga tabel turunan aplikasi tetap mengikuti seeded turnamen terbaru.
 * atlet_stats menyimpan kode asli (A/B/C+/C-/D/UNSEEDED),
 * rankings menyimpan label UI (Seed A/.../Seed C-/Non Seeded).
 */
export async function syncLatestTournamentSeedsToMembers() {
  const seedMap = await getLatestTournamentSeedMap();
  const { data: athletes, error: athleteError } = await supabase
    .from('pendaftaran')
    .select('id,nama');
  if (athleteError) throw athleteError;

  for (const athlete of athletes || []) {
    const name = String(athlete.nama || '').trim().toLocaleLowerCase('id-ID');
    const seed = seedMap.get(name) || 'UNSEEDED';

    const { error: statsError } = await supabase
      .from('atlet_stats')
      .update({ seed })
      .eq('pendaftaran_id', athlete.id);
    if (statsError) throw statsError;

    const { error: rankingError } = await supabase
      .from('rankings')
      .update({ seed: seedLabel(seed) })
      .eq('pendaftaran_id', athlete.id);
    if (rankingError) throw rankingError;
  }

  return { syncedAthletes: athletes?.length || 0, seededAthletes: seedMap.size };
}
