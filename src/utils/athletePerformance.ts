import { supabase } from '../supabase';

export interface AthletePerformance {
  id: string;
  pendaftaranId: string;
  nama: string;
  foto_url?: string;
  category?: string;
  poin: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  streak: number;
  attendanceRate: number | null;
  attendancePresent: number;
  attendanceExcused: number;
  attendanceAbsent: number;
  attendanceTotal: number;
  stamina: number | null;
  speed: number | null;
  power: number | null;
  technique: number | null;
  agility: number | null;
  flexibility: number | null;
  raporScore: number | null;
  raporUpdatedAt?: string;
  physical: Record<string, number>;
  technical: Record<string, number>;
  winLossHistory: { bulan: string; menang: number; kalah: number; seri: number }[];
  attendanceMonthly: { bulan: string; hadir: number; total: number }[];
}

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

function asList(value: any): any[] {
  if (!value) return [];
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function finiteNumber(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

function getRapor(rows: any[], rankingId: string, pendaftaranId: string, name: string) {
  return rows.find((r: any) =>
    String(r?.id ?? '') === rankingId ||
    String(r?.id ?? '') === pendaftaranId ||
    norm(r?.nama) === norm(name)
  ) || null;
}

function resultType(value: any): 'win' | 'loss' | 'draw' | 'other' {
  const v = norm(value);
  if (v.includes('menang') || v === 'win' || v.includes('winner')) return 'win';
  if (v.includes('kalah') || v === 'loss' || v.includes('lose')) return 'loss';
  if (v.includes('seri') || v.includes('draw') || v.includes('imbang')) return 'draw';
  return 'other';
}

function calcStreak(matches: any[]): number {
  const ordered = [...matches].sort((a, b) =>
    new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  );
  let streak = 0;
  for (const match of ordered) {
    if (resultType(match?.hasil) === 'win') streak++;
    else break;
  }
  return streak;
}

function calcMonthly(matches: any[]) {
  const months = new Map<string, { bulan: string; menang: number; kalah: number; seri: number; ts: number }>();
  for (const match of matches) {
    const d = new Date(match?.created_at || '');
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = months.get(key) || {
      bulan: d.toLocaleDateString('id-ID', { month: 'short' }),
      menang: 0, kalah: 0, seri: 0, ts: d.getTime()
    };
    const type = resultType(match?.hasil);
    if (type === 'win') entry.menang++;
    else if (type === 'loss') entry.kalah++;
    else if (type === 'draw') entry.seri++;
    months.set(key, entry);
  }
  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ bulan: v.bulan, menang: v.menang, kalah: v.kalah, seri: v.seri }));
}

function attendanceFor(
  attendanceRows: any[],
  users: any[],
  pendaftaranId: string,
  name: string
) {
  const userNames = new Set(
    users
      .filter((u: any) => String(u?.id ?? '') === pendaftaranId)
      .map((u: any) => norm(u?.nama))
      .filter(Boolean)
  );
  userNames.add(norm(name));

  const rows = attendanceRows.filter((a: any) =>
    String(a?.user_id ?? '') === pendaftaranId ||
    userNames.has(norm(a?.nama))
  );

  const present = rows.filter((a: any) => norm(a?.status) === 'hadir').length;
  const excused = rows.filter((a: any) => norm(a?.status) === 'izin').length;
  const absent = rows.filter((a: any) => norm(a?.status) === 'alfa').length;
  const monthly = new Map<string, { bulan: string; hadir: number; total: number; sort: string }>();

  for (const row of rows) {
    const d = new Date(row?.tanggal || row?.created_at || '');
    if (Number.isNaN(d.getTime())) continue;
    const sort = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const current = monthly.get(sort) || {
      bulan: d.toLocaleDateString('id-ID', { month: 'short' }),
      hadir: 0,
      total: 0,
      sort
    };
    current.total++;
    if (norm(row?.status) === 'hadir') current.hadir++;
    monthly.set(sort, current);
  }

  return {
    total: rows.length,
    present,
    excused,
    absent,
    rate: rows.length ? Math.round((present / rows.length) * 100) : null,
    monthly: Array.from(monthly.values()).sort((a, b) => a.sort.localeCompare(b.sort)).map(({ bulan, hadir, total }) => ({ bulan, hadir, total }))
  };
}

export async function loadAthletePerformanceData(): Promise<AthletePerformance[]> {
  const [rankingsRes, registrationsRes, statsRes, matchesRes, settingsRes] = await Promise.all([
    supabase.from('rankings').select('*').order('total_points', { ascending: false }),
    supabase.from('pendaftaran').select('id,nama,foto_url,kategori,kategori_atlet'),
    supabase.from('atlet_stats').select('*'),
    supabase.from('pertandingan').select('id,pendaftaran_id,kategori_kegiatan,hasil,keterangan,created_at').order('created_at', { ascending: true }),
    supabase.from('site_settings').select('key,value,updated_at').in('key', ['rapor_atlet_data','absensi_list','users_list'])
  ]);

  if (rankingsRes.error) throw rankingsRes.error;
  if (registrationsRes.error) throw registrationsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  const rankings = rankingsRes.data || [];
  const registrations = registrationsRes.data || [];
  const stats = statsRes.data || [];
  const matches = matchesRes.data || [];
  const settings = settingsRes.data || [];

  const setting = (key: string) => settings.find((s: any) => s.key === key);
  const raporRows = asList(setting('rapor_atlet_data')?.value);
  const attendanceRows = asList(setting('absensi_list')?.value);
  const users = asList(setting('users_list')?.value);

  const registrationById = new Map(registrations.map((p: any) => [String(p.id), p]));
  const statsByRegistration = new Map<string, any>();
  for (const s of stats) {
    if (s?.pendaftaran_id) statsByRegistration.set(String(s.pendaftaran_id), s);
  }

  // Gunakan tabel pendaftaran sebagai MASTER daftar atlet, sama seperti halaman Profil Atlet.
  // Rankings hanya menjadi sumber tambahan untuk poin/peringkat, bukan sumber jumlah atlet.
  // Dengan demikian atlet yang belum memiliki baris rankings tetap ikut terhitung.
  const rankingByRegistration = new Map<string, any>();
  const rankingByName = new Map<string, any>();
  for (const ranking of rankings) {
    if (ranking?.pendaftaran_id) rankingByRegistration.set(String(ranking.pendaftaran_id), ranking);
    const rankingName = norm(ranking?.player_name || ranking?.nama);
    if (rankingName) rankingByName.set(rankingName, ranking);
  }

  return registrations
    .map((registration: any) => {
      const pendaftaranId = String(registration?.id || '');
      if (!pendaftaranId) return null;

      const name = registration?.nama || 'Atlet';
      const ranking = rankingByRegistration.get(pendaftaranId) || rankingByName.get(norm(name)) || null;
      const rankingId = String(ranking?.id || '');
      const playerMatches = matches.filter((m: any) => String(m?.pendaftaran_id || '') === pendaftaranId);
      const wins = playerMatches.filter((m: any) => resultType(m?.hasil) === 'win').length;
      const losses = playerMatches.filter((m: any) => resultType(m?.hasil) === 'loss').length;
      const draws = playerMatches.filter((m: any) => resultType(m?.hasil) === 'draw').length;
      const decided = wins + losses;
      const rapor = getRapor(raporRows, rankingId, pendaftaranId, name);
      const physicalRaw = rapor?.fisik || {};
      const technicalRaw = rapor?.teknik || {};
      const physical: Record<string, number> = {};
      const technical: Record<string, number> = {};

      for (const key of ['stamina','kecepatan','kekuatan','kelincahan','kelenturan']) {
        const n = finiteNumber(physicalRaw[key]);
        if (n !== null) physical[key] = n;
      }
      for (const key of ['lob','smash','netting','dropShot','backhand','service']) {
        const n = finiteNumber(technicalRaw[key]);
        if (n !== null) technical[key] = n;
      }

      const allRapor = [...Object.values(physical), ...Object.values(technical)];
      const raporScore = allRapor.length
        ? Math.round(allRapor.reduce((a, b) => a + b, 0) / allRapor.length)
        : null;
      const attendance = attendanceFor(attendanceRows, users, pendaftaranId, name);
      const statsRow = statsByRegistration.get(pendaftaranId);
      const rankingPoints = Number(ranking?.total_points ?? ranking?.poin ?? 0) || 0;
      const statsPoints = statsRow ? (Number(statsRow?.points || 0) + Number(statsRow?.total_points || 0)) : 0;

      return {
        id: rankingId || pendaftaranId,
        pendaftaranId,
        nama: name,
        foto_url: registration?.foto_url || ranking?.photo_url || undefined,
        category: registration?.kategori_atlet || registration?.kategori || ranking?.category || undefined,
        poin: statsRow ? statsPoints : rankingPoints,
        matchesPlayed: playerMatches.length,
        wins,
        losses,
        draws,
        winRate: decided ? Math.round((wins / decided) * 100) : 0,
        streak: calcStreak(playerMatches),
        attendanceRate: attendance.rate,
        attendancePresent: attendance.present,
        attendanceExcused: attendance.excused,
        attendanceAbsent: attendance.absent,
        attendanceTotal: attendance.total,
        stamina: physical.stamina ?? null,
        speed: physical.kecepatan ?? null,
        power: physical.kekuatan ?? null,
        technique: Object.values(technical).length
          ? Math.round(Object.values(technical).reduce((a, b) => a + b, 0) / Object.values(technical).length)
          : null,
        agility: physical.kelincahan ?? null,
        flexibility: physical.kelenturan ?? null,
        raporScore,
        raporUpdatedAt: rapor?.updatedAt || setting('rapor_atlet_data')?.updated_at || undefined,
        physical,
        technical,
        winLossHistory: calcMonthly(playerMatches),
        attendanceMonthly: attendance.monthly
      } as AthletePerformance;
    })
    .filter(Boolean) as AthletePerformance[];
}

export function buildAggregateMonthlyTrend(players: AthletePerformance[]) {
  const map = new Map<string, { month: string; sort: string; wins: number; losses: number; attendancePresent: number; attendanceTotal: number }>();

  for (const player of players) {
    for (const month of player.winLossHistory) {
      const key = month.bulan;
      const current = map.get(key) || {
        month: key,
        sort: key,
        wins: 0,
        losses: 0,
        attendancePresent: 0,
        attendanceTotal: 0
      };
      current.wins += month.menang;
      current.losses += month.kalah;
      map.set(key, current);
    }

    for (const month of player.attendanceMonthly) {
      const current = map.get(month.bulan) || {
        month: month.bulan,
        sort: month.bulan,
        wins: 0,
        losses: 0,
        attendancePresent: 0,
        attendanceTotal: 0
      };
      current.attendancePresent += month.hadir;
      current.attendanceTotal += month.total;
      map.set(month.bulan, current);
    }
  }

  return Array.from(map.values()).map(m => ({
    month: m.month,
    Kehadiran: m.attendanceTotal ? Math.round((m.attendancePresent / m.attendanceTotal) * 100) : null,
    turnamen_winrate: (m.wins + m.losses) ? Math.round((m.wins / (m.wins + m.losses)) * 100) : 0,
    skor_avg: (m.wins + m.losses) ? Math.round((m.wins / (m.wins + m.losses)) * 100) : 0
  }));
}
