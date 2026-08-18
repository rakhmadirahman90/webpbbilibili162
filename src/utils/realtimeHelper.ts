import { supabase } from '../supabase';

// Deduplication cache to prevent infinite loops / duplicate triggers
const processedEvents = new Set<string>();

function getEventFingerprint(table: string, eventType: string, id: any): string {
  return `${table}:${eventType}:${id || 'unknown'}:${Math.floor(Date.now() / 1500)}`;
}

// HTML5 BroadcastChannel for zero-latency local tab synchronization
const localBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('pbilibili-global-realtime-v2')
  : null;

// Track active global channel reference
let activeSupabaseChannel: any = null;

/**
 * Broadcasts a data mutation (Insert, Update, Delete, Upsert) to all connected devices,
 * tabs, and server subscribers in real time.
 */
export const broadcastDataChange = async (
  tableOrKey: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
  payloadData: any
) => {
  const eventId = getEventFingerprint(tableOrKey, eventType, payloadData?.id || payloadData?.key || 'custom');
  if (processedEvents.has(eventId)) {
    return;
  }
  processedEvents.add(eventId);
  setTimeout(() => processedEvents.delete(eventId), 5000);

  const payload = {
    table: tableOrKey,
    key: tableOrKey,
    eventType,
    data: payloadData,
    value: payloadData,
    timestamp: Date.now()
  };

  // 1. Dispatch local window CustomEvents immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_data_changed', { detail: payload }));
    window.dispatchEvent(new CustomEvent(`table_updated_${tableOrKey}`, { detail: payload }));
    if (tableOrKey.includes('_config') || tableOrKey.includes('_content') || tableOrKey.includes('settings')) {
      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: tableOrKey, value: payloadData } }));
    }
  }

  // 2. Broadcast via HTML5 BroadcastChannel for instant local cross-tab sync
  if (localBroadcastChannel) {
    try {
      localBroadcastChannel.postMessage(payload);
    } catch (e) {}
  }

  // 3. Broadcast via Supabase Realtime channel to other devices
  try {
    if (activeSupabaseChannel) {
      await activeSupabaseChannel.send({
        type: 'broadcast',
        event: 'data_changed',
        payload
      });
    }
  } catch (e) {
    console.warn('[Realtime] Supabase broadcast notice:', e);
  }

  // 4. Send to Express Server API for persistent store & SSE distribution
  try {
    fetch('/api/realtime-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Initializes global real-time listeners across Supabase Postgres Changes,
 * Supabase Broadcasts, Express SSE, and HTML5 BroadcastChannel.
 */
export function initGlobalRealtimeSync() {
  if (typeof window === 'undefined') return;

  // Listen to HTML5 BroadcastChannel
  if (localBroadcastChannel) {
    localBroadcastChannel.onmessage = (event) => {
      if (event.data && event.data.table) {
        const { table, eventType, data } = event.data;
        const fingerprint = getEventFingerprint(table, eventType, data?.id || data?.key);
        if (!processedEvents.has(fingerprint)) {
          processedEvents.add(fingerprint);
          setTimeout(() => processedEvents.delete(fingerprint), 5000);
          window.dispatchEvent(new CustomEvent('app_data_changed', { detail: event.data }));
          window.dispatchEvent(new CustomEvent(`table_updated_${table}`, { detail: event.data }));
          if (table.includes('_config') || table.includes('_content') || table.includes('settings')) {
            window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: table, value: data } }));
          }
        }
      }
    };
  }

  // Listen to Express Server SSE Stream
  try {
    const es = new EventSource('/api/site-settings/stream');
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const tableKey = parsed.table || parsed.key;
        if (tableKey) {
          const val = parsed.data || parsed.value;
          const fingerprint = getEventFingerprint(tableKey, parsed.eventType || 'UPDATE', val?.id || val?.key);
          if (!processedEvents.has(fingerprint)) {
            processedEvents.add(fingerprint);
            setTimeout(() => processedEvents.delete(fingerprint), 5000);

            if (parsed.key) {
              try {
                localStorage.setItem(`site_setting_${parsed.key}`, typeof val === 'string' ? val : JSON.stringify(val));
              } catch (e) {}
            }

            const detail = { table: tableKey, key: tableKey, eventType: parsed.eventType || 'UPDATE', data: val, value: val };
            window.dispatchEvent(new CustomEvent('app_data_changed', { detail }));
            window.dispatchEvent(new CustomEvent(`table_updated_${tableKey}`, { detail }));
            window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: tableKey, value: val } }));
          }
        }
      } catch (e) {}
    };
  } catch (e) {}

  // Listen to Supabase Realtime (Postgres Changes & Broadcasts)
  try {
    const channel = supabase.channel('global-app-realtime-v2', {
      config: { broadcast: { self: false } }
    });
    activeSupabaseChannel = channel;

    channel
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = payload.table;
        const eventType = payload.eventType;
        const rowData = payload.new || payload.old;
        const fingerprint = getEventFingerprint(table, eventType, rowData?.id || rowData?.key);

        if (!processedEvents.has(fingerprint)) {
          processedEvents.add(fingerprint);
          setTimeout(() => processedEvents.delete(fingerprint), 5000);

          const eventDetail = {
            table,
            key: table === 'site_settings' ? rowData?.key : table,
            eventType,
            data: rowData,
            value: rowData?.value || rowData,
            timestamp: Date.now()
          };

          window.dispatchEvent(new CustomEvent('app_data_changed', { detail: eventDetail }));
          window.dispatchEvent(new CustomEvent(`table_updated_${table}`, { detail: eventDetail }));
          if (table === 'site_settings' && rowData?.key) {
            window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: rowData.key, value: rowData.value } }));
          }
        }
      })
      .on('broadcast', { event: 'data_changed' }, ({ payload }) => {
        if (payload && payload.table) {
          const fingerprint = getEventFingerprint(payload.table, payload.eventType, payload.data?.id || payload.data?.key);
          if (!processedEvents.has(fingerprint)) {
            processedEvents.add(fingerprint);
            setTimeout(() => processedEvents.delete(fingerprint), 5000);

            window.dispatchEvent(new CustomEvent('app_data_changed', { detail: payload }));
            window.dispatchEvent(new CustomEvent(`table_updated_${payload.table}`, { detail: payload }));
            if (payload.table.includes('_config') || payload.table.includes('_content') || payload.table.includes('settings')) {
              window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: payload.table, value: payload.data } }));
            }
          }
        }
      })
      .subscribe();
  } catch (e) {
    console.warn('[Realtime] Global channel setup warning:', e);
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  initGlobalRealtimeSync();
}
