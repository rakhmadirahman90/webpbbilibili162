import { supabase } from '../supabase';
import { useEffect } from 'react';

/**
 * Lightweight realtime synchronization for public/admin data.
 * Realtime is event driven; aggressive 5s polling caused repeated Supabase
 * requests, unnecessary rerenders and visible loading/flicker on mobile.
 */
export interface RealtimeSubscriptionOptions {
  tables?: string | string[];
  settingKeys?: string | string[];
  onUpdate: (payload?: any) => void;
}

export function subscribeToRealtime({ tables, settingKeys, onUpdate }: RealtimeSubscriptionOptions) {
  if (typeof window === 'undefined') return () => {};

  const tableList = Array.isArray(tables) ? tables : tables ? [tables] : [];
  const keyList = Array.isArray(settingKeys) ? settingKeys : settingKeys ? [settingKeys] : [];

  const handleEvent = (e: any) => {
    const detail = e.detail || {};
    const detailTable = detail.table;
    const detailKey = detail.key || detail.table;

    const tableMatch = tableList.length === 0 || !detailTable || tableList.includes(detailTable);
    const keyMatch = keyList.length === 0 || keyList.includes(detailKey) || keyList.includes(detail.key);

    if (tableMatch && keyMatch) onUpdate(detail);
  };

  // Browser focus/online events are a cheap recovery mechanism after a device
  // sleeps or temporarily loses connectivity. They do not run continuously.
  const handleFocus = () => onUpdate();

  window.addEventListener('app_data_changed', handleEvent);
  window.addEventListener('site_setting_updated', handleEvent);
  window.addEventListener('force_refresh_data', handleFocus);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleFocus);
  document.addEventListener('visibilitychange', handleFocus);

  tableList.forEach(tbl => window.addEventListener(`table_updated_${tbl}`, handleEvent));

  const channelName = `unified-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  if (tableList.length > 0) {
    tableList.forEach(tbl => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, payload => {
        onUpdate(payload);
      });
    });
  } else {
    ['site_settings', 'pendaftaran', 'rankings', 'atlet_stats', 'konfigurasi_popup', 'arsip_surat'].forEach(tbl => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, payload => {
        onUpdate(payload);
      });
    });
  }

  channel.on('broadcast', { event: 'data_changed' }, ({ payload }) => {
    if (!payload) return;
    if (
      tableList.length === 0 ||
      !payload.table ||
      tableList.includes(payload.table) ||
      (payload.key && keyList.includes(payload.key))
    ) {
      onUpdate(payload);
    }
  });

  // Subscribe only after every callback has been registered. Never attach
  // postgres_changes handlers to an already-subscribed channel.
  void channel.subscribe(status => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      // A later focus/online event will trigger a normal refresh without
      // creating a polling storm.
      console.warn(`[realtime] ${channelName}: ${status}`);
    }
  });

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('app_data_changed', handleEvent);
    window.removeEventListener('site_setting_updated', handleEvent);
    window.removeEventListener('force_refresh_data', handleFocus);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleFocus);
    document.removeEventListener('visibilitychange', handleFocus);
    tableList.forEach(tbl => window.removeEventListener(`table_updated_${tbl}`, handleEvent));
  };
}

export function useRealtimeSync(options: RealtimeSubscriptionOptions) {
  useEffect(() => subscribeToRealtime(options), []);
}
