import { useEffect } from 'react';

export interface RealtimeSubscriptionOptions {
  tables?: string | string[];
  settingKeys?: string | string[];
  onUpdate: (payload?: any) => void;
}

/**
 * Components subscribe to the single global realtime event bus.
 * No component creates its own Supabase channel and no 5-second polling is used.
 */
export function subscribeToRealtime({ tables, settingKeys, onUpdate }: RealtimeSubscriptionOptions) {
  if (typeof window === 'undefined') return () => {};

  const tableList = Array.isArray(tables) ? tables : tables ? [tables] : [];
  const keyList = Array.isArray(settingKeys) ? settingKeys : settingKeys ? [settingKeys] : [];

  const matches = (detail: any) => {
    if (!detail) return false;
    const table = detail.table;
    const key = detail.key;
    if (tableList.length === 0 && keyList.length === 0) return true;
    if (tableList.length > 0 && table && tableList.includes(table)) return true;
    if (keyList.length > 0 && key && keyList.includes(key)) return true;
    return false;
  };

  const handleEvent = (e: any) => {
    const detail = e.detail || {};
    if (matches(detail)) onUpdate(detail);
  };

  const handleFocus = () => {
    // Do not automatically hit Supabase on every focus/visibility event.
    // Components may explicitly refresh when they know data is stale.
  };

  window.addEventListener('app_data_changed', handleEvent);
  window.addEventListener('site_setting_updated', handleEvent);
  window.addEventListener('force_refresh_data', handleFocus);

  tableList.forEach(tbl => window.addEventListener(`table_updated_${tbl}`, handleEvent));

  return () => {
    window.removeEventListener('app_data_changed', handleEvent);
    window.removeEventListener('site_setting_updated', handleEvent);
    window.removeEventListener('force_refresh_data', handleFocus);
    tableList.forEach(tbl => window.removeEventListener(`table_updated_${tbl}`, handleEvent));
  };
}

export function useRealtimeSync(options: RealtimeSubscriptionOptions) {
  useEffect(() => subscribeToRealtime(options), []);
}
