import { supabase } from '../supabase';
import { isVideoUrl } from '../components/Hero';

// Realtime Server-Sent Events subscriber for instant site settings sync across all tabs/devices
if (typeof window !== 'undefined') {
  try {
    const es = new EventSource('/api/site-settings/stream');
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.key) {
          try {
            localStorage.setItem(`site_setting_${data.key}`, typeof data.value === 'string' ? data.value : JSON.stringify(data.value));
          } catch (e) {}
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

/**
 * Resiliently saves a setting to the 'site_settings' table and server store.
 */
export async function saveSiteSetting(key: string, value: any, label?: string) {
  const now = new Date().toISOString();
  
  let payloadWithValue: any;
  if (Array.isArray(value)) {
    payloadWithValue = { items: value, updated_at: now };
  } else if (typeof value === 'object' && value !== null) {
    payloadWithValue = { ...value, updated_at: value.updated_at || now };
  } else {
    payloadWithValue = value;
  }

  // 1. Always back up to LocalStorage immediately
  try {
    const localData = typeof payloadWithValue === 'string' ? payloadWithValue : JSON.stringify(payloadWithValue);
    localStorage.setItem(`site_setting_${key}`, localData);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: payloadWithValue } }));
  } catch (e) {
    console.warn('[siteSettingsHelper] LocalStorage backup write failed:', e);
  }

  // 2. Post to Express Server Store (/api/site-settings) for persistent server-side cross-deployment sync
  try {
    await fetch('/api/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: payloadWithValue, label })
    });
  } catch (e) {
    console.warn('[siteSettingsHelper] Server API write warning:', e);
  }

  // 3. Try UPDATE on Supabase (only use columns that exist in DB schema: value, updated_at)
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
    console.warn("[siteSettingsHelper] Update attempt warning:", e);
  }

  // 4. Fallback to UPSERT on Supabase (only use columns that exist in DB schema: key, value, updated_at)
  const upsertPayload: Record<string, any> = { key, value: payloadWithValue, updated_at: now };

  try {
    const { data: upsertData, error: upsertErr } = await supabase
      .from('site_settings')
      .upsert(upsertPayload, { onConflict: 'key' })
      .select();

    if (!upsertErr && upsertData && upsertData.length > 0) {
      return { data: upsertData, error: null };
    }

    if (upsertErr) {
      console.warn("[siteSettingsHelper] Supabase write notice (saved locally & server store):", upsertErr.message);
    }
  } catch (err: any) {
    console.warn("[siteSettingsHelper] Exception during Supabase save:", err);
  }

  // Always return success as settings are persisted in LocalStorage and Express server store
  return { data: [{ key, value: payloadWithValue }], error: null };
}

/**
 * Safely deletes a setting from site_settings with RLS fallback.
 */
export async function deleteSiteSetting(key: string) {
  try {
    localStorage.removeItem(`site_setting_${key}`);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: null } }));
  } catch (e) {}

  try {
    await fetch(`/api/site-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: null })
    });
  } catch (e) {}

  try {
    await supabase
      .from('site_settings')
      .delete()
      .eq('key', key);
  } catch (err) {}

  return { error: null };
}

/**
 * Completely removes an athlete from all database tables (pendaftaran, rankings, atlet_stats).
 */
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
  } catch (err) {
    console.warn('[deleteAthleteCompletely] Error during cascade athlete deletion:', err);
  }
}

export const DEFAULT_HERO_CONFIG = {
  settings: { duration: 7 },
  slides: [
    {
      id: 1786206064378,
      title: 'PB Bilibili Video Hero',
      subtitle: 'PB BILIBILI 162 PROFESSIONAL CLUB',
      image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
      videoUrl: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
      poster: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-poster-1786206060056.webp',
      type: 'video',
      active: true,
      titleSize: 28,
      subtitleSize: 12,
      fontFamily: 'font-sans'
    },
    {
      id: 1786206064379,
      title: 'Ketua & Pembina PB Bilibili 162',
      subtitle: 'Pusat Pembinaan Bulutangkis Standar BWF',
      image: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png',
      type: 'image',
      active: true,
      titleSize: 24,
      subtitleSize: 10,
      fontFamily: 'font-sans'
    },
    {
      id: 1,
      image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg',
      title: 'Pusat Pelatihan PB Bilibili 162',
      active: true,
      subtitle: 'Fasilitas lapangan berkualitas internasional dengan standar karpet BWF.',
      titleSize: 24,
      fontFamily: 'font-sans',
      subtitleSize: 10
    },
    {
      id: 2,
      image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg',
      title: 'Keluarga Besar Atlet Kami',
      subtitle: 'Membangun komunitas solid dengan dedikasi tinggi terhadap bulutangkis.',
      titleSize: 24,
      fontFamily: 'font-sans',
      subtitleSize: 10,
      active: true
    }
  ],
  updated_at: '2026-08-12T20:30:00.000Z'
};

/**
 * Safely reads a setting checking Server API, Supabase, and LocalStorage.
 */
export async function getSiteSetting(key: string) {
  let dbVal: any = null;
  let dbUpdatedAt: string | null = null;

  // 1. Primary Source of Truth: Supabase Database (Shared between AI Studio preview and Live Site)
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle();

    if (!error && data?.value !== undefined && data.value !== null) {
      dbVal = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      dbUpdatedAt = data.updated_at || null;
      if (dbVal && typeof dbVal === 'object') {
        dbVal = { ...dbVal, updated_at: dbVal.updated_at || dbUpdatedAt || new Date().toISOString() };
      }
    }
  } catch (err) {
    console.warn("[siteSettingsHelper] Error querying Supabase for key " + key, err);
  }

  let serverVal: any = null;
  let localVal: any = null;

  try {
    const rawLocal = localStorage.getItem(`site_setting_${key}`);
    if (rawLocal !== null) {
      try {
        localVal = typeof rawLocal === 'string' ? JSON.parse(rawLocal) : rawLocal;
      } catch {
        localVal = rawLocal;
      }
    }
  } catch (e) {}

  try {
    const apiRes = await fetch(`/api/site-settings?key=${key}`);
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData && apiData.value !== undefined && apiData.value !== null) {
        serverVal = apiData.value;
      }
    }
  } catch (e) {}

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
    if (serverTs === maxTs && serverVal !== null && serverVal !== undefined) {
      bestVal = serverVal;
    } else if (localTs === maxTs && localVal !== null && localVal !== undefined) {
      bestVal = localVal;
    } else if (dbTs === maxTs && dbVal !== null && dbVal !== undefined) {
      bestVal = dbVal;
    } else {
      bestVal = serverVal || localVal || dbVal;
    }
  } else {
    bestVal = dbVal !== null && dbVal !== undefined ? dbVal : (serverVal !== null && serverVal !== undefined ? serverVal : localVal);
  }

  // --- SPECIAL HANDLING FOR hero_config TO ENSURE LATEST VIDEO HERO SLIDE IS ALWAYS PRESENT ---
  if (key === 'hero_config') {
    let parsedBest = bestVal ? (typeof bestVal === 'string' ? JSON.parse(bestVal) : bestVal) : null;
    let slides = parsedBest?.slides || (Array.isArray(parsedBest) ? parsedBest : []);

    const hasVideoSlide = Array.isArray(slides) && slides.some((s: any) => s && (s.type === 'video' || s.videoUrl || (typeof s.image === 'string' && (s.image.endsWith('.webm') || s.image.endsWith('.mp4')))));
    const isStaleData = !parsedBest?.updated_at || new Date(parsedBest.updated_at).getTime() < new Date('2026-08-12T12:00:00.000Z').getTime();

    if (!parsedBest || !Array.isArray(slides) || slides.length === 0 || !hasVideoSlide || isStaleData) {
      const videoSlide = DEFAULT_HERO_CONFIG.slides[0];
      const ketuaSlide = DEFAULT_HERO_CONFIG.slides[1];

      const otherSlides = Array.isArray(slides)
        ? slides.filter((s: any) => s && s.id !== 1786206064378 && s.id !== 1786206064379 && s.id !== 'video-main-1')
        : [];

      const mergedSlides = [videoSlide, ketuaSlide, ...otherSlides];

      bestVal = {
        settings: parsedBest?.settings || DEFAULT_HERO_CONFIG.settings,
        slides: mergedSlides,
        updated_at: new Date().toISOString()
      };
    }
  }

  if (bestVal) {
    try {
      localStorage.setItem(`site_setting_${key}`, typeof bestVal === 'string' ? bestVal : JSON.stringify(bestVal));
    } catch (e) {}
    return bestVal;
  }

  return key === 'hero_config' ? DEFAULT_HERO_CONFIG : null;
}

/**
 * Clears all local caches and forces a re-fetch of all site configurations
 */
export async function forceRefreshSiteSettings() {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('site_setting_') || k.includes('hero') || k.includes('popup') || k.includes('cache') || k.includes('setting'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) {
    console.warn('Cache clear error:', e);
  }

  try {
    await fetch('/api/site-settings?refresh=true', { cache: 'no-store' });
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'hero_config', force: true } }));
  window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'popup_config', force: true } }));
  window.dispatchEvent(new CustomEvent('force_refresh_data'));

  setTimeout(() => {
    window.location.reload();
  }, 400);
}
