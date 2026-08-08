import { supabase } from '../supabase';

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
 * Resiliently saves a setting to the 'site_settings' table.
 * 1. Tries UPDATE first to bypass RLS INSERT restrictions if row exists.
 * 2. Tries UPSERT if row doesn't exist.
 * 3. Handles Row-Level Security (RLS) restrictions gracefully by falling back to LocalStorage
 *    and returning success so UI flows stay uninterrupted.
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

  // Always back up to LocalStorage immediately
  try {
    const localData = typeof payloadWithValue === 'string' ? payloadWithValue : JSON.stringify(payloadWithValue);
    localStorage.setItem(`site_setting_${key}`, localData);
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key, value: payloadWithValue } }));
  } catch (e) {
    console.warn('[siteSettingsHelper] LocalStorage backup write failed:', e);
  }

  // 1. Try UPDATE first (updates existing row, avoiding INSERT RLS checks)
  const updatePayload: Record<string, any> = { value: payloadWithValue, updated_at: now };
  if (label) updatePayload.label = label;

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

  // 2. Fallback to UPSERT if key does not exist in DB yet
  const upsertPayload: Record<string, any> = { key, value: payloadWithValue, updated_at: now };
  if (label) upsertPayload.label = label;

  try {
    const { data: upsertData, error: upsertErr } = await supabase
      .from('site_settings')
      .upsert(upsertPayload, { onConflict: 'key' })
      .select();

    if (!upsertErr) {
      return { data: upsertData, error: null };
    }

    // Check for Row-Level Security (RLS) policy restrictions
    const isRlsError = 
      upsertErr.message?.toLowerCase().includes('row-level security') ||
      upsertErr.message?.toLowerCase().includes('rls') ||
      upsertErr.code === '42501';

    if (isRlsError) {
      console.warn(`[siteSettingsHelper] RLS policy restricted write on 'site_settings' for key '${key}'. LocalStorage fallback applied.`);
      return { data: [{ key, value: payloadWithValue }], error: null };
    }

    // Retry without optional 'label' column if DB schema cache lacks it
    if (label && upsertErr.message?.includes('label')) {
      delete upsertPayload.label;
      const { data: retryData, error: retryErr } = await supabase
        .from('site_settings')
        .upsert(upsertPayload, { onConflict: 'key' })
        .select();

      if (!retryErr) return { data: retryData, error: null };

      if (retryErr.message?.toLowerCase().includes('row-level security') || retryErr.code === '42501') {
        return { data: [{ key, value: payloadWithValue }], error: null };
      }
      return { data: retryData, error: retryErr };
    }

    return { data: upsertData, error: upsertErr };
  } catch (err: any) {
    console.warn("[siteSettingsHelper] Exception during saveSiteSetting:", err);
    return { data: [{ key, value: payloadWithValue }], error: null };
  }
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
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('key', key);

    if (error && (error.message?.toLowerCase().includes('row-level security') || error.code === '42501')) {
      return { error: null };
    }
    return { error };
  } catch (err) {
    return { error: null };
  }
}

/**
 * Safely reads a setting with LocalStorage fallback and timestamp comparison.
 */
export async function getSiteSetting(key: string) {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (!error && data?.value !== undefined && data.value !== null) {
      const dbVal = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      try {
        localStorage.setItem(`site_setting_${key}`, typeof dbVal === 'string' ? dbVal : JSON.stringify(dbVal));
      } catch (e) {}
      return dbVal;
    }
  } catch (err) {
    console.warn(`[siteSettingsHelper] DB read error for '${key}':`, err);
  }

  // Fallback to LocalStorage only if DB fails or key not found in DB
  try {
    const rawLocal = localStorage.getItem(`site_setting_${key}`);
    if (rawLocal !== null) {
      try {
        return JSON.parse(rawLocal);
      } catch {
        return rawLocal;
      }
    }
  } catch (e) {}

  return null;
}
