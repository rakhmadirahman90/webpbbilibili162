import { supabase } from '../supabase';

const processedEvents = new Set<string>();
const localBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('pbilibili-global-realtime-v3')
  : null;

let activeSupabaseChannel: any = null;
let initialized = false;

// Only subscribe to tables that actually need cross-device live updates.
// The previous implementation subscribed to every public table, which made
// Realtime consume a large amount of WAL/IO on the Nano instance.
const REALTIME_TABLES = [
  'site_settings',
  'navbar_settings',
  'konfigurasi_popup',
  'pendaftaran',
  'rankings',
  'atlet_stats',
  'kas_pb'
] as const;

function newEventId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emitLocal(payload: any) {
  if (typeof window === 'undefined' || !payload?.table) return;
  window.dispatchEvent(new CustomEvent('app_data_changed', { detail: payload }));
  window.dispatchEvent(new CustomEvent(`table_updated_${payload.table}`, { detail: payload }));
  if (payload.table === 'site_settings' && payload.key) {
    window.dispatchEvent(new CustomEvent('site_setting_updated', {
      detail: { key: payload.key, value: payload.data }
    }));
  }
}

function consume(payload: any) {
  if (!payload?.table) return;
  const eventId = payload.eventId || `${payload.table}:${payload.eventType || 'UPDATE'}:${payload.data?.id || payload.data?.key || payload.timestamp || ''}`;
  if (processedEvents.has(eventId)) return;
  processedEvents.add(eventId);
  window.setTimeout(() => processedEvents.delete(eventId), 10_000);
  emitLocal(payload);
}

export const broadcastDataChange = async (
  tableOrKey: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
  payloadData: any
) => {
  const table = tableOrKey === 'popup_config' ? 'site_settings' : tableOrKey;
  const eventId = newEventId();
  const payload = {
    eventId,
    table,
    key: tableOrKey === 'site_settings' ? payloadData?.key : tableOrKey,
    eventType,
    data: payloadData,
    value: payloadData,
    timestamp: Date.now()
  };

  consume(payload);

  if (localBroadcastChannel) {
    try { localBroadcastChannel.postMessage(payload); } catch {}
  }

  // Supabase Broadcast is enough for cross-device application-generated changes.
  // Do not additionally POST the same event to Express; that was duplicate traffic.
  try {
    if (activeSupabaseChannel) {
      await activeSupabaseChannel.send({
        type: 'broadcast',
        event: 'data_changed',
        payload
      });
    }
  } catch (e) {
    console.warn('[Realtime] Broadcast notice:', e);
  }
};

export function initGlobalRealtimeSync() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  if (localBroadcastChannel) {
    localBroadcastChannel.onmessage = (event) => consume(event.data);
  }

  try {
    const channel = supabase.channel('pb162-realtime-core', {
      config: { broadcast: { self: false } }
    });
    activeSupabaseChannel = channel;

    for (const table of REALTIME_TABLES) {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table
      }, (payload: any) => {
        const row = payload.new || payload.old || {};
        consume({
          eventId: `${table}:${payload.eventType}:${row.id || row.key || Date.now()}`,
          table,
          key: table === 'site_settings' ? row.key : table,
          eventType: payload.eventType,
          data: row,
          value: row.value ?? row,
          timestamp: Date.now()
        });
      });
    }

    channel.on('broadcast', { event: 'data_changed' }, ({ payload }: any) => {
      consume(payload);
    });

    channel.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Realtime] Channel status:', status);
      }
    });
  } catch (e) {
    console.warn('[Realtime] Global channel setup warning:', e);
  }
}

if (typeof window !== 'undefined') {
  initGlobalRealtimeSync();
}
