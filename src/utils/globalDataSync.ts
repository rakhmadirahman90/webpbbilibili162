import { supabase } from '../supabase';

const LOCAL_BROADCAST = 'pbilibili-global-realtime-v3';
const LOCAL_MUTATION_TTL = 3500;

const recentLocalMutations = new Map<string, number>();
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

function clearExpiredMutations() {
  const now = Date.now();
  for (const [key, expires] of recentLocalMutations) {
    if (expires <= now) recentLocalMutations.delete(key);
  }
}

function wasLocalMutation(table: string, eventType: string, row: any) {
  clearExpiredMutations();
  const id = row?.id ?? row?.key ?? '*';
  return (
    recentLocalMutations.has(mutationKey(table, eventType, id)) ||
    recentLocalMutations.has(mutationKey(table, eventType, '*'))
  );
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

export function initCanonicalRealtimeSync() {
  if (typeof window === 'undefined') return () => {};

  clearLegacyMirrors();

  const broadcastChannel = 'BroadcastChannel' in window
    ? new BroadcastChannel(LOCAL_BROADCAST)
    : null;

  const onBroadcast = (event: MessageEvent) => {
    if (event.data?.table) rememberLocalMutation(event.data);
    if (event.data?.detail) dispatchRefresh(event.data.detail);
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
        source: 'supabase',
      };

      dispatchRefresh(detail);

      // Do not hard-reload the SPA here. A reload storm can multiply REST
      // requests during a Supabase timeout and make the original problem worse.
      // Components receive the table-specific event and should refetch their
      // canonical row/list from Supabase instead.
      if (!wasLocalMutation(table, eventType, row)) {
        console.info('[GlobalDataSync] Remote database change:', table, eventType);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        dispatchRefresh({ source: 'realtime_connected', timestamp: Date.now() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
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
    if (channel) supabase.removeChannel(channel);
    channel = null;
  };
}

initCanonicalRealtimeSync();
