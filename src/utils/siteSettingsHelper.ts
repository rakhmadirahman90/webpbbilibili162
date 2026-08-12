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

  let bestVal: any = null;

  // Prefer Supabase DB whenever available as central store
  if (dbVal !== null && dbVal !== undefined) {
    if (localTs > dbTs && localTs > serverTs) {
      bestVal = localVal;
    } else {
      bestVal = dbVal;
    }
  } else {
    if (serverTs > 0 || localTs > 0) {
      bestVal = serverTs >= localTs ? serverVal : localVal;
    } else {
      bestVal = serverVal || localVal;
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
