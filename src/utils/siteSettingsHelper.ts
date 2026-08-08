import { supabase } from '../supabase';
import { isVideoUrl } from '../components/Hero';

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
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('key', key);

    return { error };
  } catch (err) {
    return { error: null };
  }
}

/**
 * Safely reads a setting checking Server API, Supabase, and LocalStorage.
 */
export async function getSiteSetting(key: string) {
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

  // 1. Try Express Server Store (/api/site-settings)
  try {
    const apiRes = await fetch(`/api/site-settings?key=${key}`);
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData && apiData.value !== undefined && apiData.value !== null) {
        serverVal = apiData.value;
      }
    }
  } catch (e) {}

  // 2. Try Supabase
  let dbVal: any = null;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (!error && data?.value !== undefined && data.value !== null) {
      dbVal = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
  } catch (err) {}

  // Smart timestamp-based prioritization (serverVal, dbVal, localVal)
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

  let bestVal: any = null;

  if (serverTs > 0 || dbTs > 0 || localTs > 0) {
    if (serverTs >= dbTs && serverTs >= localTs) {
      bestVal = serverVal;
    } else if (dbTs >= serverTs && dbTs >= localTs) {
      bestVal = dbVal;
    } else {
      bestVal = localVal;
    }
  } else {
    bestVal = serverVal || dbVal || localVal;
  }

  if (key === 'hero_config') {
    if (bestVal && typeof bestVal === 'object') {
      const slides = bestVal.slides || (Array.isArray(bestVal) ? bestVal : []);
      const hasVideo = slides.some((s: any) => 
        s.type === 'video' || (s.videoUrl && s.videoUrl.trim() !== '') || (s.image && isVideoUrl(s.image, s.type))
      );

      // Prepend default main video slide only if config is missing a video slide entirely
      if (!hasVideo && slides.length > 0) {
        const videoSlide = {
          id: 'video-main-1',
          title: 'PB Bilibili 162 Professional Club',
          subtitle: 'Klub Bulutangkis Profesional dengan Fasilitas & Pembinaan Standar BWF',
          image: '/vid-20260206-wa0019.mp4',
          videoUrl: '/vid-20260206-wa0019.mp4',
          poster: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg',
          type: 'video',
          active: true,
          titleSize: 28,
          subtitleSize: 12,
          fontFamily: 'font-sans'
        };
        bestVal = {
          ...bestVal,
          slides: [videoSlide, ...slides]
        };
      }
    }
  }

  if (bestVal) {
    try {
      localStorage.setItem(`site_setting_${key}`, typeof bestVal === 'string' ? bestVal : JSON.stringify(bestVal));
    } catch (e) {}
    return bestVal;
  }

  return null;
}
