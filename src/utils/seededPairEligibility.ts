import { supabase } from '../supabase';

type SeededPlayer = { name: string; seeded: string; club?: string };

const norm = (v: unknown) => String(v ?? '')
  .trim()
  .toLocaleLowerCase('id-ID')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ');

const level = (v: unknown) => String(v ?? '').trim().toUpperCase().replace(/−/g, '-');

/**
 * Eligibility resmi Bilibili 162 Cup I 2026.
 * Ajatappareng: A+D, B+C-, C++C (urutan pemain bebas).
 * Lokal Parepare: hanya C/C-/D dan semua pasangan di dalam tiga level itu.
 */
export function isAllowedSeededPair(category: string, seeded1: string, seeded2: string) {
  const a = level(seeded1);
  const b = level(seeded2);
  if (!a || !b) return false;

  if (norm(category).includes('ajatappareng')) {
    return (a === 'A' && b === 'D') || (a === 'D' && b === 'A')
      || (a === 'B' && b === 'C-') || (a === 'C-' && b === 'B')
      || (a === 'C+' && b === 'C') || (a === 'C' && b === 'C+');
  }

  if (norm(category).includes('lokal parepare')) {
    const allowed = new Set(['C', 'C-', 'D']);
    return allowed.has(a) && allowed.has(b);
  }

  return false;
}

export async function checkSeededPairEligibility(category: string, player1: string, player2: string) {
  const names = [norm(player1), norm(player2)];
  if (!names[0] || !names[1]) return { eligible: false, reason: 'Nama kedua pemain wajib diisi.' };

  const { data, error } = await supabase
    .from('seeded_players')
    .select('player_name,club_name,seeded_quality')
    .limit(5000);

  if (error) return { eligible: false, reason: `Database seeded tidak dapat diperiksa: ${error.message}`, databaseError: true };

  const rows = (data || []) as SeededPlayer[];
  const find = (name: string) => rows.find(r => norm(r.name) === name);
  const p1 = find(names[0]);
  const p2 = find(names[1]);

  if (!p1 || !p2) {
    const missing = [!p1 ? player1 : '', !p2 ? player2 : ''].filter(Boolean).join(' dan ');
    return { eligible: false, reason: `${missing} belum ditemukan pada database seeded resmi untuk kategori ini.` };
  }

  const s1 = level(p1.seeded);
  const s2 = level(p2.seeded);
  if (!isAllowedSeededPair(category, s1, s2)) {
    const kategori = norm(category).includes('ajatappareng') ? 'Ajatappareng' : 'Lokal Parepare';
    const aturan = kategori === 'Ajatappareng'
      ? 'A + D, B + C-, atau C+ + C'
      : 'hanya seeded C, C-, dan D (semua kombinasi di antara ketiganya)';
    return {
      eligible: false,
      reason: `Pasangan ${player1} (${s1}) + ${player2} (${s2}) tidak eligible untuk ${kategori}. Aturan: ${aturan}.`,
      players: [p1, p2],
      seeded: [s1, s2],
    };
  }

  return { eligible: true, players: [p1, p2], seeded: [s1, s2] };
}
