import { supabase } from '../supabase';
import { isVideoUrl } from '../components/Hero';
import { broadcastDataChange } from './realtimeHelper';

// Popup configuration is persisted in `konfigurasi_popup` and must never use
// browser/server-file caches as its source of truth. Other site settings keep
// the existing resilient cache behavior below.
const POPUP_TABLE = 'konfigurasi_popup';

if (typeof window !== 'undefined') {
  try {
    const es = new EventSource('/api/site-settings/stream');
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.key) {
          // popup_config is owned by the popup table. Ignore legacy SSE writes
          // so a stale server JSON store can never resurrect deleted/old popups.
          if (data.key !== 'popup_config') {
            try {
              localStorage.setItem(`site_setting_${data.key}`, typeof data.value === 'string' ? data.value : JSON.stringify(data.value));
            } catch (e) {}
          }
          window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: data.key, value: data.value } }));
        }
      } catch (e) {}
    };
  } catch (e) {}
}

export function parsePopupList(raw: any): any[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.slides)) return raw.slides;
  if (typeof raw === 'object' && raw !== null) {
    const keys = Object.keys(raw).filter(k => !isNaN(Number(k)));
    if (keys.length > 0) {
      return keys.sort((a, b) => Number(a) - Number(b)).map(k => raw[k]);
    }
  }
  return [];
}

function normalizePopupItem(item: any, index: number) {
  return {
    id: String(item?.id ?? `popup-${Date.now()}-${index}`),
    judul: String(item?.judul ?? ''),
    deskripsi: String(item?.deskripsi ?? ''),
    url_gambar: String(item?.url_gambar ?? ''),
    is_active: item?.is_active !== false,
    urutan: Number.isFinite(Number(item?.urutan)) ? Number(item.urutan) : index,
    file_url: item?.file_url ? String(item.file_url) : null,
  };
}

function popupPayload(value: any[]) {
  return value.map((item, index) => normalizePopupItem(item, index)).map((item, index) => ({
    ...item,
    urutan: index,
  }));
}

/**
 * Popup persistence: Supabase `konfigurasi_popup` is the ONLY source of truth.
 * The exact list is synchronized (upsert current rows + delete rows removed in UI)
 * and then read back from Supabase to verify the write. Errors are returned to the
 * caller instead of being hidden behind LocalStorage/server JSON fallbacks.
 */
async function savePopupConfigToSupabase(value: any[]) {
  const items = popupPayload(Array.isArray(value) ? value : parsePopupList(value));

  const { data: existing, error: existingError } = await supabase
    .from(POPUP_TABLE)
    .select('id');

  if (existingError) {
    throw new Error(`Gagal membaca data popup dari Supabase: ${existingError.message}`);
  }

  const wantedIds = new Set(items.map(item => item.id));
  const idsToDelete = (existing || [])
    .map((row: any) => String(row.id))
    .filter((id: string) => !wantedIds.has(id));

  if (items.length > 0) {
    const { error: upsertError } = await supabase
      .from(POPUP_TABLE)
      .upsert(items, { onConflict: 'id' });

    if (upsertError) {
      throw new Error(`Gagal menyimpan popup ke Supabase: ${upsertError.message}`);
    }
  }

  // Keep the database exactly equal to the list shown in the admin UI.
  for (const id of idsToDelete) {
    const { error: deleteError } = await supabase
      .from(POPUP_TABLE)
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Gagal menghapus popup ${id} dari Supabase: ${deleteError.message}`);
    }
  }

  const { data: verified, error: verifyError } = await supabase
    .from(POPUP_TABLE)
    .select('*')
    .order('urutan', { ascending: true });

  if (verifyError) {
    throw new Error(`Popup tersimpan tetapi verifikasi Supabase gagal: ${verifyError.message}`);
  }

  const verifiedItems = (verified || []).map((item: any, index: number) => normalizePopupItem(item, index));
  const expected = items.map((item, index) => normalizePopupItem(item, index));
  const same = JSON.stringify(verifiedItems) === JSON.stringify(expected);

  if (!same) {
    throw new Error('Verifikasi gagal: data popup di Supabase berbeda dari data yang baru disimpan.');
  }

  return verifiedItems;
}

async function loadPopupConfigFromSupabase() {
  const { data, error } = await supabase
    .from(POPUP_TABLE)
    .select('*')
    .order('urutan', { ascending: true });

  if (error) {
    throw new Error(`Gagal membaca konfigurasi popup dari Supabase: ${error.message}`);
  }

  const items = (data || [])
    .map((item: any, index: number) => normalizePopupItem(item, index))
    .sort((a: any, b: any) => (a.urutan ?? 0) - (b.urutan ?? 0));

  return {
    items,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Saves a setting. Popup config is deliberately handled separately so that
 * LocalStorage, the Express JSON store, and site_settings cannot override it.
 */
export async function saveSiteSetting(key: string, value: any, label?: string) {
  if (key === 'popup_config') {
    const verifiedItems = await savePopupConfigToSupabase(parsePopupList(value));
    const result = { items: verifiedItems, updated_at: new Date().toISOString() };

    if (typeof window !== 'undefined') {
      try {
        // Local cache is only a short-lived mirror after a successful DB write.
        localStorage.setItem(`site_setting_${key}`, JSON.stringify(result));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: result } }));
      broadcastDataChange(key, 'UPDATE', result);
    }

    return { data: result, error: null };
  }

  const now = new Date().toISOString();
  let payloadWithValue: any;
  if (Array.isArray(value)) {
    payloadWithValue = { items: value, updated_at: now };
  } else if (typeof value === 'object' && value !== null) {
    payloadWithValue = { ...value, updated_at: value.updated_at || now };
  } else {
    payloadWithValue = value;
  }

  try {
    const localData = typeof payloadWithValue === 'string' ? payloadWithValue : JSON.stringify(payloadWithValue);
    localStorage.setItem(`site_setting_${key}`, localData);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: payloadWithValue } }));
    broadcastDataChange(key, 'UPDATE', payloadWithValue);
  } catch (e) {
    console.warn('[siteSettingsHelper] LocalStorage backup write failed:', e);
  }

  try {
    const response = await fetch('/api/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: payloadWithValue, label })
    });
    if (!response.ok) {
      console.warn('[siteSettingsHelper] Server API write warning:', response.status);
    }
  } catch (e) {
    console.warn('[siteSettingsHelper] Server API write warning:', e);
  }

  const updatePayload: Record<string, any> = { value: payloadWithValue, updated_at: now };

  try {
    const { data, error: updateErr } = await supabase
      .from('site_settings')
      .update(updatePayload)
      .eq('key', key)
      .select();

    if (!updateErr && data && data.length > 0) {
      return { data, error: null };
    }
  } catch (e) {
    console.warn('[siteSettingsHelper] Update attempt warning:', e);
  }

  try {
    const { data: upsertData, error: upsertErr } = await supabase
      .from('site_settings')
      .upsert({ key, value: payloadWithValue, updated_at: now }, { onConflict: 'key' })
      .select();

    if (!upsertErr && upsertData && upsertData.length > 0) {
      return { data: upsertData, error: null };
    }

    if (upsertErr) {
      console.warn('[siteSettingsHelper] Supabase write notice:', upsertErr.message);
    }
  } catch (err: any) {
    console.warn('[siteSettingsHelper] Exception during Supabase save:', err);
  }

  // Preserve legacy behavior for non-popup settings.
  return { data: [{ key, value: payloadWithValue }], error: null };
}

export async function deleteSiteSetting(key: string) {
  if (key === 'popup_config') {
    await savePopupConfigToSupabase([]);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(`site_setting_${key}`); } catch (e) {}
      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: null } }));
      broadcastDataChange(key, 'DELETE', null);
    }
    return { error: null };
  }

  try {
    localStorage.removeItem(`site_setting_${key}`);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: null } }));
    broadcastDataChange(key, 'DELETE', null);
  } catch (e) {}

  try {
    const response = await fetch(`/api/site-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: null })
    });
    if (!response.ok) console.warn('[siteSettingsHelper] Server delete warning:', response.status);
  } catch (e) {}

  try {
    await supabase.from('site_settings').delete().eq('key', key);
  } catch (err) {}

  return { error: null };
}

export async function deleteAthleteCompletely(id?: string, name?: string) {
  try {
    const promises: Promise<any>[] = [];
    if (id) {
      promises.push(supabase.from('pendaftaran').delete().eq('id', id));
      promises.push(supabase.from('rankings').delete().eq('pendaftaran_id', id));
      promises.push(supabase.from('atlet_stats').delete().eq('pendaftaran_id', id));
    }
    if (name && name.trim()) {
      const cleanName = name.trim();
      promises.push(supabase.from('pendaftaran').delete().ilike('nama', cleanName));
      promises.push(supabase.from('rankings').delete().ilike('player_name', cleanName));
      promises.push(supabase.from('atlet_stats').delete().ilike('player_name', cleanName));
    }
    await Promise.allSettled(promises);
    broadcastDataChange('pendaftaran', 'DELETE', { id, name });
    broadcastDataChange('rankings', 'DELETE', { id, name });
    broadcastDataChange('atlet_stats', 'DELETE', { id, name });
  } catch (err) {
    console.warn('[deleteAthleteCompletely] Error during cascade athlete deletion:', err);
  }
}

export const DEFAULT_HERO_CONFIG = {
  settings: { duration: 7 },
  slides: [
    { id: 1786206064378, title: 'PB Bilibili Video Hero', subtitle: 'PB BILIBILI 162 PROFESSIONAL CLUB', image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm', videoUrl: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm', poster: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-poster-1786206060056.webp', type: 'video', active: true, titleSize: 28, subtitleSize: 12, fontFamily: 'font-sans' },
    { id: 1786206064379, title: 'Ketua & Pembina PB Bilibili 162', subtitle: 'Pusat Pembinaan Bulutangkis Standar BWF', image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png', type: 'image', active: false, titleSize: 24, subtitleSize: 10, fontFamily: 'font-sans' },
    { id: 1, image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg', title: 'Pusat Pelatihan PB Bilibili 162', active: false, subtitle: 'Fasilitas lapangan berkualitas internasional dengan standar karpet BWF.', titleSize: 24, fontFamily: 'font-sans', subtitleSize: 10 },
    { id: 2, image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg', title: 'Keluarga Besar Atlet Kami', active: false, subtitle: 'Membangun komunitas solid dengan dedikasi tinggi terhadap bulutangkis.', titleSize: 24, fontFamily: 'font-sans', subtitleSize: 10 }
  ],
  updated_at: '2026-08-12T23:59:59.000Z'
};

export function appendCacheBustParam(url?: string, timestamp?: string | number): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  let ts: number;
  if (typeof timestamp === 'number') ts = timestamp;
  else if (typeof timestamp === 'string' && timestamp.trim().length > 0) {
    const parsed = new Date(timestamp).getTime();
    ts = !isNaN(parsed) && parsed > 0 ? parsed : (Number(timestamp) || Date.now());
  } else ts = Date.now();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const u = new URL(trimmed);
      u.searchParams.set('v', String(ts));
      return u.toString();
    }
    const [base, search] = trimmed.split('?');
    const params = new URLSearchParams(search || '');
    params.set('v', String(ts));
    return `${base}?${params.toString()}`;
  } catch {
    const delim = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${delim}v=${ts}`;
  }
}

export function applyCacheBustingToHeroSlides(slides: any[], configTimestamp?: string | number): any[] {
  if (!Array.isArray(slides)) return [];
  return slides.map((slide) => {
    if (!slide || typeof slide !== 'object') return slide;
    const slideTs = slide.updated_at || slide.timestamp || slide.id || configTimestamp || Date.now();
    return {
      ...slide,
      image: slide.image ? appendCacheBustParam(slide.image, slideTs) : slide.image,
      videoUrl: slide.videoUrl ? appendCacheBustParam(slide.videoUrl, slideTs) : slide.videoUrl,
      poster: slide.poster ? appendCacheBustParam(slide.poster, slideTs) : slide.poster,
    };
  });
}

const siteSettingsMemoryCache = new Map<string, any>();

function sanitizeKeyConfig(key: string, val: any) {
  if (key === 'hero_config') {
    let parsedBest = val;
    if (typeof val === 'string') {
      try { parsedBest = JSON.parse(val); } catch { parsedBest = val; }
    }
    let slides = parsedBest?.slides || (Array.isArray(parsedBest) ? parsedBest : []);
    const hasVideoSlide = Array.isArray(slides) && slides.some((s: any) => s && (s.type === 'video' || s.videoUrl || (typeof s.image === 'string' && (s.image.endsWith('.webm') || s.image.endsWith('.mp4')))));
    const isStaleData = !parsedBest?.updated_at || new Date(parsedBest.updated_at).getTime() < new Date('2026-08-12T23:50:00.000Z').getTime();
    let finalSlides = slides;
    if (!parsedBest || !Array.isArray(slides) || slides.length === 0 || !hasVideoSlide || isStaleData) {
      const defaultVideoSlide = DEFAULT_HERO_CONFIG.slides[0];
      const existingVideoSlide = Array.isArray(slides) ? slides.find((s: any) => s && (s.id === 1786206064378 || s.type === 'video' || s.videoUrl)) : null;
      const videoSlide = existingVideoSlide ? { ...defaultVideoSlide, ...existingVideoSlide, active: true } : defaultVideoSlide;
      const otherSlides = Array.isArray(slides) && slides.length > 0 ? slides.filter((s: any) => s && s.id !== 1786206064378 && s.type !== 'video' && !s.videoUrl) : DEFAULT_HERO_CONFIG.slides.slice(1);
      finalSlides = [videoSlide, ...otherSlides];
    }
    const configTs = parsedBest?.updated_at || new Date().toISOString();
    const sanitizedSlides = (Array.isArray(finalSlides) ? finalSlides : []).map((s: any) => {
      if (!s || typeof s !== 'object') return s;
      const isVid = s.type === 'video' || s.videoUrl || (typeof s.image === 'string' && (s.image.endsWith('.webm') || s.image.endsWith('.mp4')));
      if (!isVid) return { ...s, active: false };
      return { ...s, active: s.active !== false };
    });
    return { settings: parsedBest?.settings || DEFAULT_HERO_CONFIG.settings, slides: applyCacheBustingToHeroSlides(sanitizedSlides, configTs), updated_at: configTs };
  }
  return val;
}

async function fetchFreshSiteSetting(key: string) {
  // Popup bypasses all generic caches and reads directly from its canonical table.
  if (key === 'popup_config') {
    const popupValue = await loadPopupConfigFromSupabase();
    siteSettingsMemoryCache.set(key, popupValue);
    try { localStorage.setItem(`site_setting_${key}`, JSON.stringify(popupValue)); } catch (e) {}
    return popupValue;
  }

  let dbVal: any = null;
  let dbUpdatedAt: string | null = null;
  const supabasePromise = (async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('value, updated_at').eq('key', key).maybeSingle();
      if (!error && data?.value !== undefined && data.value !== null) {
        dbVal = data.value;
        if (typeof dbVal === 'string') {
          try { dbVal = JSON.parse(dbVal); } catch { dbVal = data.value; }
        }
        dbUpdatedAt = data.updated_at || null;
        if (dbVal && typeof dbVal === 'object') dbVal = { ...dbVal, updated_at: dbVal.updated_at || dbUpdatedAt || new Date().toISOString() };
      }
    } catch (err) {
      console.warn('[siteSettingsHelper] Error querying Supabase for key ' + key, err);
    }
  })();

  let serverVal: any = null;
  const apiPromise = (async () => {
    try {
      const apiRes = await fetch(`/api/site-settings?key=${key}`);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData && apiData.value !== undefined && apiData.value !== null) serverVal = apiData.value;
      }
    } catch (e) {}
  })();

  let localVal: any = null;
  try {
    const rawLocal = localStorage.getItem(`site_setting_${key}`);
    if (rawLocal !== null) {
      try { localVal = JSON.parse(rawLocal); } catch { localVal = rawLocal; }
    }
  } catch (e) {}

  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1500));
  await Promise.race([Promise.allSettled([supabasePromise, apiPromise]), timeoutPromise]);

  const getTimestamp = (val: any) => {
    if (!val) return 0;
    const parsed = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return {}; } })() : val;
    if (parsed && typeof parsed === 'object' && parsed.updated_at) {
      const t = new Date(parsed.updated_at).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  const serverTs = getTimestamp(serverVal);
  const dbTs = getTimestamp(dbVal);
  const localTs = getTimestamp(localVal);
  const maxTs = Math.max(dbTs, serverTs, localTs);
  let bestVal: any = null;

  if (maxTs > 0) {
    if (serverTs === maxTs && serverVal !== null && serverVal !== undefined) bestVal = serverVal;
    else if (localTs === maxTs && localVal !== null && localVal !== undefined) bestVal = localVal;
    else if (dbTs === maxTs && dbVal !== null && dbVal !== undefined) bestVal = dbVal;
    else bestVal = serverVal || localVal || dbVal;
  } else {
    bestVal = dbVal !== null && dbVal !== undefined ? dbVal : (serverVal !== null && serverVal !== undefined ? serverVal : localVal);
  }

  const finalVal = sanitizeKeyConfig(key, bestVal || (key === 'hero_config' ? DEFAULT_HERO_CONFIG : null));
  if (finalVal) {
    siteSettingsMemoryCache.set(key, finalVal);
    try { localStorage.setItem(`site_setting_${key}`, typeof finalVal === 'string' ? finalVal : JSON.stringify(finalVal)); } catch (e) {}
  }
  return finalVal;
}

function refreshSiteSettingInBackground(key: string) {
  setTimeout(() => {
    fetchFreshSiteSetting(key).then(newVal => {
      if (newVal) {
        siteSettingsMemoryCache.set(key, newVal);
        window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: newVal } }));
      }
    }).catch((err) => {
      if (key === 'popup_config') console.warn('[siteSettingsHelper] Popup background refresh failed:', err);
    });
  }, 100);
}

export async function getSiteSetting(key: string) {
  // Popup always bypasses memory/LocalStorage and reads Supabase directly.
  if (key === 'popup_config') {
    return await fetchFreshSiteSetting(key);
  }

  if (siteSettingsMemoryCache.has(key)) {
    const cached = siteSettingsMemoryCache.get(key);
    refreshSiteSettingInBackground(key);
    return cached;
  }

  let localVal: any = null;
  try {
    const rawLocal = localStorage.getItem(`site_setting_${key}`);
    if (rawLocal !== null) {
      try { localVal = JSON.parse(rawLocal); } catch { localVal = rawLocal; }
    }
  } catch (e) {}

  if (localVal !== null && localVal !== undefined) {
    const sanitized = sanitizeKeyConfig(key, localVal);
    siteSettingsMemoryCache.set(key, sanitized);
    refreshSiteSettingInBackground(key);
    return sanitized;
  }

  return await fetchFreshSiteSetting(key);
}

export async function forceRefreshSiteSettings() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('site_setting_') || k.includes('hero') || k.includes('popup') || k.includes('cache') || k.includes('setting'))) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    siteSettingsMemoryCache.clear();
  } catch (e) {
    console.warn('Cache clear error:', e);
  }

  try { await fetch('/api/site-settings?refresh=true', { cache: 'no-store' }); } catch (e) {}
  window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'hero_config', force: true } }));
  window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'popup_config', force: true } }));
  window.dispatchEvent(new CustomEvent('force_refresh_data'));
  setTimeout(() => window.location.reload(), 400);
}
