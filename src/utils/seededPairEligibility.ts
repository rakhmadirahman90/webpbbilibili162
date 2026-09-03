import { supabase } from '../supabase';

type SeededPlayerRow = {
  player_name: string | null;
  club_name: string | null;
  seeded_quality: string | null;
  division_level?: string | null;
  normalized_name?: string | null;
  validity_status?: string | null;
};

type PairResult = {
  eligible: boolean;
  reason: string;
  players?: SeededPlayerRow[];
  seeded?: string[];
  databaseError?: boolean;
};

// Harus identik dengan format normalized_name yang dibuat trigger database:
// lower(trim(player_name)) lalu semua karakter non a-z/0-9 menjadi spasi.
// Ini membuat nama seperti "A.BARGA", "A BARGA", dan "A-BARGA"
// dapat dicocokkan ke record seeded yang sama.
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

// Menyimpan hasil pasangan yang baru saja dinyatakan eligible. Ini penting agar
// validasi otomatis di layar dan validasi saat tombol LANJUT/SIMPAN tidak saling
// bertentangan akibat race-condition atau perbedaan hasil query.
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
    // CC Lokal Parepare hanya mengizinkan:
    // C- + C-, C- + D, atau D + D (urutan pemain bebas).
    return (a === 'C-' && b === 'C-')
      || (a === 'C-' && b === 'D')
      || (a === 'D' && b === 'C-')
      || (a === 'D' && b === 'D');
  }

  return false;
}

/**
 * Cek pasangan berdasarkan kolom database yang benar:
 * player_name / normalized_name / seeded_quality / division_level.
 * Hasil eligible disimpan sementara agar langkah berikutnya tidak dapat
 * membatalkan pasangan yang sudah lolos hanya karena query kedua berbeda.
 */
export async function checkSeededPairEligibility(category: string, player1: string, player2: string): Promise<PairResult> {
  const names = [norm(player1), norm(player2)];
  if (!names[0] || !names[1]) {
    return { eligible: false, reason: 'Nama kedua pemain wajib diisi.' };
  }

  const key = pairKey(category, player1, player2);
  const cached = eligibilityCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) eligibilityCache.delete(key);

  let { data, error } = await supabase
    .from('seeded_players')
    .select('player_name,club_name,seeded_quality,division_level,normalized_name,validity_status')
    .in('normalized_name', names)
    .limit(100);

  // Fallback untuk record lama yang normalized_name-nya belum terisi atau
  // belum mengikuti trigger terbaru.
  if (!error && (!data || data.length < 2)) {
    const fallback = await supabase
      .from('seeded_players')
      .select('player_name,club_name,seeded_quality,division_level,normalized_name,validity_status')
      .limit(5000);
    if (!fallback.error) {
      data = fallback.data;
    }
  }

  if (error) {
    return {
      eligible: false,
      reason: `Database seeded tidak dapat diperiksa: ${error.message}`,
      databaseError: true,
    };
  }

  const rows = (data || []) as SeededPlayerRow[];
  const find = (target: string) => {
    const targetNorm = norm(target);
    return rows.find(r => norm(r.normalized_name) === targetNorm)
      || rows.find(r => norm(r.player_name) === targetNorm);
  };

  const p1 = find(player1);
  const p2 = find(player2);

  if (!p1 || !p2) {
    const missing = [!p1 ? player1 : '', !p2 ? player2 : ''].filter(Boolean).join(' dan ');
    return {
      eligible: false,
      reason: `${missing} belum ditemukan pada database seeded resmi. Pastikan nama pemain dipilih dari data seeded.`,
    };
  }

  const s1 = level(p1.seeded_quality || p1.division_level);
  const s2 = level(p2.seeded_quality || p2.division_level);

  if (!s1 || !s2) {
    return {
      eligible: false,
      reason: `Level seeded ${player1} atau ${player2} belum tersedia pada database seeded.`,
      players: [p1, p2],
      seeded: [s1, s2],
    };
  }

  if (!isAllowedSeededPair(category, s1, s2)) {
    const kategori = norm(category).includes('ajatappareng') ? 'Ajatappareng' : 'Lokal Parepare';
    const aturan = kategori === 'Ajatappareng'
      ? 'A + D, B + C-, atau C+ + C (urutan bebas)'
      : 'C- + C-, C- + D, atau D + D (urutan bebas)';
    return {
      eligible: false,
      reason: `Pasangan ${player1} (${s1}) + ${player2} (${s2}) tidak eligible untuk ${kategori}. Aturan: ${aturan}.`,
      players: [p1, p2],
      seeded: [s1, s2],
    };
  }

  const result: PairResult = {
    eligible: true,
    reason: `Eligible: ${player1} (${s1}) + ${player2} (${s2}).`,
    players: [p1, p2],
    seeded: [s1, s2],
  };
  eligibilityCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

export function clearSeededPairEligibilityCache() {
  eligibilityCache.clear();
}
