import { supabase } from '../supabase';
import { isVideoUrl } from '../components/Hero';

/**
 * Site settings are database-backed. LocalStorage and the Express store are
 * notifications/cache only; they are never authoritative for hero_config.
 * This prevents two browsers/devices from rendering different hero content.
 */
if (typeof window !== 'undefined') {
  try {
    const es = new EventSource('/api/site-settings/stream');
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.key) return;

        // Never persist server-event payloads as the source of truth. The
        // canonical value is always read from Supabase, especially hero_config.
        if (data.key !== 'hero_config') {
          try {
            localStorage.setItem(
              `site_setting_${data.key}`,
              typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
            );
          } catch {}
        }

        window.dispatchEvent(new CustomEvent('site_setting_updated', {
          detail: { key: data.key, value: data.value }
        }));
      } catch {}
    };
  } catch {}
}

export function parsePopupList(raw: any): any[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return []; }
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

function normalizeSettingValue(value: any, now: string) {
  if (Array.isArray(value)) return { items: value, updated_at: now };
  if (typeof value === 'object' && value !== null) {
    return { ...value, updated_at: value.updated_at || now };
  }
  return value;
}

/**
 * Saves a site setting.
 *
 * hero_config intentionally uses Supabase as the single authoritative write
 * target. We do not report success when only LocalStorage/server filesystem
 * persistence succeeded, because that creates browser/deployment drift.
 */
export async function saveSiteSetting(key: string, value: any, label?: string) {
  const now = new Date().toISOString();
  const payloadWithValue = normalizeSettingValue(value, now);

  if (key === 'hero_config') {
    const updatePayload: Record<string, any> = {
      value: payloadWithValue,
      updated_at: now,
    };

    try {
      const { data, error: updateErr } = await supabase
        .from('site_settings')
        .update(updatePayload)
        .eq('key', key)
        .select();

      if (!updateErr && data && data.length > 0) {
        try {
          localStorage.setItem(`site_setting_${key}`, JSON.stringify(payloadWithValue));
          window.dispatchEvent(new CustomEvent('site_setting_updated', {
            detail: { key, value: payloadWithValue }
          }));
        } catch {}
        return { data, error: null };
      }
    } catch (error) {
      console.warn('[siteSettingsHelper] Hero update failed:', error);
    }

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .upsert({ key, ...updatePayload }, { onConflict: 'key' })
        .select();

      if (!error && data && data.length > 0) {
        try {
          localStorage.setItem(`site_setting_${key}`, JSON.stringify(payloadWithValue));
          window.dispatchEvent(new CustomEvent('site_setting_updated', {
            detail: { key, value: payloadWithValue }
          }));
        } catch {}
        return { data, error: null };
      }

      return { data: null, error: error || new Error('Hero configuration could not be persisted to Supabase.') };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  // Existing resilient path for non-hero settings.
  try {
    const localData = typeof payloadWithValue === 'string'
      ? payloadWithValue
      : JSON.stringify(payloadWithValue);
    localStorage.setItem(`site_setting_${key}`, localData);
    window.dispatchEvent(new CustomEvent('site_setting_updated', {
      detail: { key, value: payloadWithValue }
    }));
  } catch (e) {
    console.warn('[siteSettingsHelper] LocalStorage backup write failed:', e);
  }

  try {
    await fetch('/api/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: payloadWithValue, label }),
    });
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
    if (!updateErr && data && data.length > 0) return { data, error: null };
  } catch (e) {
    console.warn('[siteSettingsHelper] Update attempt warning:', e);
  }

  try {
    const { data: upsertData, error: upsertErr } = await supabase
      .from('site_settings')
      .upsert({ key, ...updatePayload }, { onConflict: 'key' })
      .select();

    if (!upsertErr && upsertData && upsertData.length > 0) {
      return { data: upsertData, error: null };
    }

    if (upsertErr) {
      console.warn('[siteSettingsHelper] Supabase write notice:', upsertErr.message);
    }
  } catch (err) {
    console.warn('[siteSettingsHelper] Exception during Supabase save:', err);
  }

  return { data: [{ key, value: payloadWithValue }], error: null };
}

export async function deleteSiteSetting(key: string) {
  if (key === 'hero_config') {
    try {
      const { error } = await supabase
        .from('site_settings')
        .delete()
        .eq('key', key);
      if (!error) {
        try { localStorage.removeItem(`site_setting_${key}`); } catch {}
        window.dispatchEvent(new CustomEvent('site_setting_updated', {
          detail: { key, value: null }
        }));
      }
      return { error };
    } catch (error) {
      return { error };
    }
  }

  try {
    localStorage.removeItem(`site_setting_${key}`);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: null } }));
  } catch {}

  try {
    await fetch('/api/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: null }),
    });
  } catch {}

  try {
    const { error } = await supabase.from('site_settings').delete().eq('key', key);
    return { error };
  } catch (err) {
    return { error: null };
  }
}

/**
 * Reads a site setting. hero_config is deliberately read only from Supabase
 * so every browser/device receives the same canonical configuration.
 */
export async function getSiteSetting(key: string) {
  if (key === 'hero_config') {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value, updated_at')
        .eq('key', key)
        .maybeSingle();

      if (!error && data?.value !== undefined && data?.value !== null) {
        let value: any = data.value;
        if (typeof value === 'string') {
          try { value = JSON.parse(value); } catch {}
        }
        if (value && typeof value === 'object' && data.updated_at && !value.updated_at) {
          value = { ...value, updated_at: data.updated_at };
        }
        return value;
      }

      if (error) console.warn('[siteSettingsHelper] Hero read error:', error.message);
    } catch (error) {
      console.warn('[siteSettingsHelper] Hero read exception:', error);
    }

    // Do not return browser-local or deployment-local hero data. A stale
    // fallback is exactly what caused different browsers to show different slides.
    return null;
  }

  let serverVal: any = null;
  let localVal: any = null;

  try {
    const rawLocal = localStorage.getItem(`site_setting_${key}`);
    if (rawLocal !== null) {
      try { localVal = JSON.parse(rawLocal); } catch { localVal = rawLocal; }
    }
  } catch {}

  try {
    const apiRes = await fetch(`/api/site-settings?key=${key}`, { cache: 'no-store' });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData?.value !== undefined && apiData?.value !== null) serverVal = apiData.value;
    }
  } catch {}

  let dbVal: any = null;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!error && data?.value !== undefined && data?.value !== null) {
      dbVal = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
  } catch {}

  const getTimestamp = (val: any) => {
    if (!val) return 0;
    const parsed = typeof val === 'string'
      ? (() => { try { return JSON.parse(val); } catch { return {}; } })()
      : val;
    if (parsed?.updated_at) {
      const t = new Date(parsed.updated_at).getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    return 0;
  };

  const serverTs = getTimestamp(serverVal);
  const dbTs = getTimestamp(dbVal);
  const localTs = getTimestamp(localVal);

  let bestVal: any = null;
  if (serverTs > 0 || dbTs > 0 || localTs > 0) {
    if (serverTs >= dbTs && serverTs >= localTs) bestVal = serverVal;
    else if (dbTs >= serverTs && dbTs >= localTs) bestVal = dbVal;
    else bestVal = localVal;
  } else {
    bestVal = serverVal || dbVal || localVal;
  }

  if (bestVal) {
    try {
      localStorage.setItem(
        `site_setting_${key}`,
        typeof bestVal === 'string' ? bestVal : JSON.stringify(bestVal)
      );
    } catch {}
    return bestVal;
  }

  return null;
}

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
  } catch {}

  window.dispatchEvent(new CustomEvent('site_setting_updated', {
    detail: { key: 'hero_config', force: true }
  }));
  window.dispatchEvent(new CustomEvent('site_setting_updated', {
    detail: { key: 'popup_config', force: true }
  }));
  window.dispatchEvent(new CustomEvent('force_refresh_data'));
}
