import { supabase } from '../supabase';

type SeededPlayerRow = {
  player_name: string | null;
  club_name: string | null;
  seeded_quality: string | null;
  division_level?: string | null;
  normalized_name?: string | null;
  validity_status?: string | null;
  eligible_category?: string | null;
};

type PairResult = {
  eligible: boolean;
  reason: string;
  players?: SeededPlayerRow[];
  seeded?: string[];
  databaseError?: boolean;
};

const norm = (v: unknown) => String(v ?? '')
  .trim()
  .toLocaleLowerCase('id-ID')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const level = (v: unknown) => String(v ?? '')
  .trim()
  .toUpperCase()
  .replace(/[−–—]/g, '-');

const pairKey = (category: string, player1: string, player2: string) =>
  `${norm(category)}::${[norm(player1), norm(player2)].sort().join('::')}`;

const eligibilityCache = new Map<string, { result: PairResult; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/** Aturan resmi Bilibili 162 Cup I 2026. */
export function isAllowedSeededPair(category: string, seeded1: string, seeded2: string) {
  const a = level(seeded1);
  const b = level(seeded2);
  if (!a || !b) return false;

  const cat = norm(category);
  if (cat.includes('ajatappareng')) {
    return (a === 'A' && b === 'D') || (a === 'D' && b === 'A')
      || (a === 'B' && b === 'C-') || (a === 'C-' && b === 'B')
      || (a === 'C+' && b === 'C') || (a === 'C' && b === 'C+');
  }

  if (cat.includes('lokal parepare')) {
    // CC Lokal Parepare hanya mengizinkan C- + C-, C- + D, atau D + D.
    return (a === 'C-' && b === 'C-')
      || (a === 'C-' && b === 'D')
      || (a === 'D' && b === 'C-')
      || (a === 'D' && b === 'D');
  }

  return false;
}

const categoryMatches = (category: string, seededCategory?: string | null) => {
  const declared = norm(seededCategory);
  const target = norm(category);
  if (!declared || !target) return false;
  return declared === target
    || (declared.includes('ajatappareng') && target.includes('ajatappareng'))
    || (declared.includes('lokal parepare') && target.includes('lokal parepare'));
};

/**
 * Cek pasangan berdasarkan SEMUA record seeded dengan nama tersebut.
 * eligible_category dipakai sebagai preferensi, bukan syarat mutlak, karena
 * data seeded lama dapat menyimpan kategori sumber yang berbeda sementara
 * level pemain tetap sah untuk kategori lain sesuai aturan pasangan.
 */
export async function checkSeededPairEligibility(category: string, player1: string, player2: string): Promise<PairResult> {
  const names = [norm(player1), norm(player2)];
  if (!names[0] || !names[1]) return { eligible: false, reason: 'Nama kedua pemain wajib diisi.' };

  const key = pairKey(category, player1, player2);
  const cached = eligibilityCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) eligibilityCache.delete(key);

  let { data, error } = await supabase
    .from('seeded_players')
    .select('player_name,club_name,seeded_quality,division_level,normalized_name,validity_status,eligible_category')
    .in('normalized_name', names)
    .limit(100);

  if (!error && (!data || data.length < 2)) {
    const fallback = await supabase
      .from('seeded_players')
      .select('player_name,club_name,seeded_quality,division_level,normalized_name,validity_status,eligible_category')
      .limit(5000);
    if (!fallback.error) data = fallback.data;
  }

  if (error) {
    return { eligible: false, reason: `Database seeded tidak dapat diperiksa: ${error.message}`, databaseError: true };
  }

  const rows = (data || []) as SeededPlayerRow[];
  const allCandidates = (target: string) => rows.filter(r => {
    const sameName = norm(r.normalized_name) === norm(target) || norm(r.player_name) === norm(target);
    const valid = !r.validity_status || norm(r.validity_status) === 'valid';
    return sameName && valid;
  });

  const chooseCandidates = (target: string) => {
    const all = allCandidates(target);
    const preferred = all.filter(r => categoryMatches(category, r.eligible_category));
    return preferred.length ? [...preferred, ...all.filter(r => !preferred.includes(r))] : all;
  };

  const p1Candidates = chooseCandidates(player1);
  const p2Candidates = chooseCandidates(player2);

  if (!p1Candidates.length || !p2Candidates.length) {
    const missing = [!p1Candidates.length ? player1 : '', !p2Candidates.length ? player2 : ''].filter(Boolean).join(' dan ');
    return {
      eligible: false,
      reason: `${missing} belum ditemukan pada database seeded resmi. Pastikan nama pemain dipilih dari data seeded yang sesuai.`,
    };
  }

  for (const p1 of p1Candidates) {
    for (const p2 of p2Candidates) {
      const s1 = level(p1.seeded_quality || p1.division_level);
      const s2 = level(p2.seeded_quality || p2.division_level);
      if (s1 && s2 && isAllowedSeededPair(category, s1, s2)) {
        const result: PairResult = {
          eligible: true,
          reason: `Eligible: ${player1} (${s1}) + ${player2} (${s2}) untuk ${norm(category).includes('ajatappareng') ? 'Ajatappareng' : 'Lokal Parepare'}. Pemain boleh main rangkap di kategori lain selama pasangan dan level seeded memenuhi aturan kategori tersebut.`,
          players: [p1, p2],
          seeded: [s1, s2],
        };
        eligibilityCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL });
        return result;
      }
    }
  }

  const levels1 = [...new Set(p1Candidates.map(p => level(p.seeded_quality || p.division_level)).filter(Boolean))];
  const levels2 = [...new Set(p2Candidates.map(p => level(p.seeded_quality || p.division_level)).filter(Boolean))];
  const aturan = norm(category).includes('ajatappareng')
    ? 'A + D, B + C-, atau C+ + C (urutan bebas)'
    : 'C- + C-, C- + D, atau D + D (urutan bebas)';

  return {
    eligible: false,
    reason: `Pasangan ${player1} (${levels1.join('/') || '-'}) + ${player2} (${levels2.join('/') || '-'}) tidak eligible untuk ${norm(category).includes('ajatappareng') ? 'Ajatappareng' : 'Lokal Parepare'}. Aturan: ${aturan}.`,
    players: [p1Candidates[0], p2Candidates[0]],
    seeded: [levels1[0] || '', levels2[0] || ''],
  };
}

export function clearSeededPairEligibilityCache() {
  eligibilityCache.clear();
}
