import { supabase } from '../supabase';

const LOCAL_BROADCAST = 'pbilibili-global-realtime-v2';
const LOCAL_MUTATION_TTL = 3500;
const RELOAD_DEBOUNCE = 650;

const recentLocalMutations = new Map<string, number>();
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;

function mutationKey(table: string, eventType: string, id?: unknown) {
  return `${table}:${eventType}:${String(id ?? '*')}`;
}

function rememberLocalMutation(payload: any) {
  const table = payload?.table;
  const eventType = payload?.eventType;
  if (!table || !eventType) return;
  const id = payload?.data?.id ?? payload?.data?.key ?? '*';
  recentLocalMutations.set(mutationKey(table, eventType, id), Date.now() + LOCAL_MUTATION_TTL);
}

function wasLocalMutation(table: string, eventType: string, row: any) {
  const now = Date.now();
  const id = row?.id ?? row?.key ?? '*';
  const exact = mutationKey(table, eventType, id);
  const wildcard = mutationKey(table, eventType, '*');
  for (const [key, expires] of recentLocalMutations) {
    if (expires <= now) recentLocalMutations.delete(key);
  }
  return recentLocalMutations.has(exact) || recentLocalMutations.has(wildcard);
}

function clearLegacyMirrors() {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('site_setting_')) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('[GlobalDataSync] Could not clear legacy mirrors:', error);
  }
}

function dispatchRefresh(detail: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app_data_changed', { detail }));
  window.dispatchEvent(new CustomEvent('force_refresh_data', { detail }));
  if (detail?.table) {
    window.dispatchEvent(new CustomEvent(`table_updated_${detail.table}`, { detail }));
  }
}

function scheduleHardRefresh() {
  if (typeof window === 'undefined') return;
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    if (document.visibilityState === 'hidden') return;
    window.location.reload();
  }, RELOAD_DEBOUNCE);
}

export function initCanonicalRealtimeSync() {
  if (typeof window === 'undefined') return () => {};

  clearLegacyMirrors();

  const broadcastChannel = 'BroadcastChannel' in window
    ? new BroadcastChannel(LOCAL_BROADCAST)
    : null;

  const onBroadcast = (event: MessageEvent) => {
    if (event.data?.table) rememberLocalMutation(event.data);
  };
  broadcastChannel?.addEventListener('message', onBroadcast);

  channel = supabase.channel(`canonical-db-sync-${Math.random().toString(36).slice(2, 10)}`);
  channel
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
      const table = payload.table;
      const eventType = payload.eventType;
      const row = payload.new || payload.old || {};
      const detail = {
        table,
        key: table === 'site_settings' ? row.key : table,
        eventType,
        data: row,
        value: row?.value ?? row,
        timestamp: Date.now(),
        source: 'supabase'
      };

      dispatchRefresh(detail);

      if (!wasLocalMutation(table, eventType, row)) {
        scheduleHardRefresh();
      }
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[GlobalDataSync] Supabase realtime status:', status);
      }
    });

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      dispatchRefresh({ source: 'visibility', timestamp: Date.now() });
    }
  };
  const onOnline = () => dispatchRefresh({ source: 'online', timestamp: Date.now() });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);

  return () => {
    broadcastChannel?.removeEventListener('message', onBroadcast);
    broadcastChannel?.close();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = null;
    if (channel) supabase.removeChannel(channel);
    channel = null;
  };
}

initCanonicalRealtimeSync();
