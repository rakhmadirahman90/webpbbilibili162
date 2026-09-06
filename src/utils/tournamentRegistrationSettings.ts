import { supabase } from '../supabase';

export const TOURNAMENT_SETTINGS_KEY = 'tournament_registration_settings';
export const AJATAPPARENG_CATEGORY = 'Ganda Putra AD/BC-/C+C Ajatappareng';
export const LOKAL_PAREPARE_CATEGORY = 'Ganda Putra CC Lokal Parepare';

export type TournamentRegistrationSettings = {
  enabled: boolean;
  cutoffDate: string;
  categories: {
    ajatappareng: { label: string; target: number };
    lokalParepare: { label: string; target: number };
  };
  message: string;
  updated_at?: string;
};

export const DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS: TournamentRegistrationSettings = {
  enabled: true,
  cutoffDate: '2026-09-08',
  categories: {
    ajatappareng: { label: AJATAPPARENG_CATEGORY, target: 64 },
    lokalParepare: { label: LOKAL_PAREPARE_CATEGORY, target: 128 },
  },
  message: 'Pendaftaran otomatis ditutup jika kuota kategori penuh atau mulai 08 September 2026.',
};

const parse = (value: any): TournamentRegistrationSettings => {
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { v = null; }
  }
  return {
    ...DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS,
    ...(v || {}),
    categories: {
      ...DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS.categories,
      ...(v?.categories || {}),
    },
  };
};

export async function getTournamentRegistrationSettings(): Promise<TournamentRegistrationSettings> {
  try {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', TOURNAMENT_SETTINGS_KEY).maybeSingle();
    if (!error && data?.value) return parse(data.value);
  } catch {}
  try {
    const raw = localStorage.getItem(`site_setting_${TOURNAMENT_SETTINGS_KEY}`);
    if (raw) return parse(raw);
  } catch {}
  return DEFAULT_TOURNAMENT_REGISTRATION_SETTINGS;
}

export function getCategoryTarget(settings: TournamentRegistrationSettings, category: string) {
  if (category === AJATAPPARENG_CATEGORY) return settings.categories.ajatappareng.target;
  if (category === LOKAL_PAREPARE_CATEGORY) return settings.categories.lokalParepare.target;
  return 0;
}

export function getWitaDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function isRegistrationDateClosed(settings: TournamentRegistrationSettings, date = new Date()) {
  return Boolean(settings.enabled && settings.cutoffDate && getWitaDateString(date) >= settings.cutoffDate);
}

export async function getCategoryAvailability(category: string) {
  const settings = await getTournamentRegistrationSettings();
  const target = getCategoryTarget(settings, category);
  if (!settings.enabled) return { settings, category, target, count: 0, remaining: 0, closed: true, reason: 'Pendaftaran turnamen sedang ditutup oleh admin.' };
  if (isRegistrationDateClosed(settings)) return { settings, category, target, count: 0, remaining: 0, closed: true, reason: `Pendaftaran turnamen sudah ditutup mulai ${settings.cutoffDate}.` };
  if (!target) return { settings, category, target: 0, count: 0, remaining: 0, closed: false, reason: '' };
  const { count, error } = await supabase
    .from('pendaftaran_turnamen')
    .select('id', { count: 'exact', head: true })
    .eq('kategori', category)
    .not('status_pendaftaran', 'in', '(Ditolak,rejected)');
  if (error) throw error;
  const safeCount = Number(count || 0);
  const remaining = Math.max(0, target - safeCount);
  return {
    settings,
    category,
    target,
    count: safeCount,
    remaining,
    closed: remaining <= 0,
    reason: remaining <= 0 ? `Kuota ${category} sudah penuh (${target} pasangan).` : '',
  };
}
