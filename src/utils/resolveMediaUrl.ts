import { SUPABASE_URL } from '../supabase';

const OLD_PROJECT = 'missjyvqfehamtpyodjr.supabase.co';
const NEW_PROJECT = 'hoyrgpbfbakogenxdijt.supabase.co';

/** Rewrite only known legacy Supabase Storage URLs, never arbitrary external URLs. */
export function resolveMediaUrl(value?: string | null): string {
  if (!value) return '';
  const url = value.trim();
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== OLD_PROJECT || !parsed.pathname.startsWith('/storage/v1/')) return url;
    const target = new URL(SUPABASE_URL);
    if (target.hostname !== NEW_PROJECT) return url;
    return target.origin + parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}
