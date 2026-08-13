import { supabase } from '../supabase';
import { useEffect } from 'react';

/**
 * Unified Realtime Sync utility module for standardized Supabase subscriptions,
 * Broadcasts, SSE, and custom event listeners across all UI components (Hero, Popup, AdminDashboard, etc.).
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

    let match = false;
    if (tableList.length > 0 && detailTable && tableList.includes(detailTable)) {
      match = true;
    }
    if (keyList.length > 0 && (keyList.includes(detailKey) || keyList.includes(detail.key))) {
      match = true;
    }
    if (tableList.length === 0 && keyList.length === 0) {
      match = true; // global listener if none specified
    }

    if (match) {
      onUpdate(detail);
    }
  };

  const handleFocus = () => onUpdate();

  window.addEventListener('app_data_changed', handleEvent);
  window.addEventListener('site_setting_updated', handleEvent);
  window.addEventListener('force_refresh_data', handleFocus);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleFocus);
  document.addEventListener('visibilitychange', handleFocus);

  tableList.forEach(tbl => {
    window.addEventListener(`table_updated_${tbl}`, handleEvent);
  });

  // Supabase channel subscription
  const channelName = `unified-realtime-${Math.random().toString(36).substring(2, 9)}`;
  let channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  if (tableList.length > 0) {
    tableList.forEach(tbl => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, (payload) => {
        onUpdate(payload);
      });
    });
  } else {
    // Default listening to common tables
    ['site_settings', 'pendaftaran', 'rankings', 'atlet_stats', 'konfigurasi_popup', 'arsip_surat'].forEach(tbl => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, (payload) => {
        onUpdate(payload);
      });
    });
  }

  channel
    .on('broadcast', { event: 'data_changed' }, ({ payload }) => {
      if (payload) {
        if (tableList.length === 0 || tableList.includes(payload.table) || keyList.includes(payload.key)) {
          onUpdate(payload);
        }
      }
    })
    .subscribe();

  // Polling interval fallback for guaranteed live sync
  const pollInterval = setInterval(() => {
    onUpdate();
  }, 5000);

  return () => {
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
    window.removeEventListener('app_data_changed', handleEvent);
    window.removeEventListener('site_setting_updated', handleEvent);
    window.removeEventListener('force_refresh_data', handleFocus);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleFocus);
    document.removeEventListener('visibilitychange', handleFocus);
    tableList.forEach(tbl => {
      window.removeEventListener(`table_updated_${tbl}`, handleEvent);
    });
  };
}

export function useRealtimeSync(options: RealtimeSubscriptionOptions) {
  useEffect(() => {
    return subscribeToRealtime(options);
  }, []);
}
