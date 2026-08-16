import { remoteSupabase } from '../supabase';

const PUBLIC_TABLES = [
  'berita',
  'pendaftaran',
  'rankings',
  'gallery',
  'galeri',
  'hero_sliders',
  'page_contents',
  'organizational_structure',
  'contacts',
  'footer_settings',
  'kas_pb',
  'navbar_settings',
  'navbar_menu',
  'komentar',
  'pertandingan',
  'atlet_stats',
  'pendaftar',
  'site_settings',
  'documents',
  'konfigurasi_popup',
];

let channel: ReturnType<typeof remoteSupabase.channel> | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function isPublicRoute() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  return !path.startsWith('/admin') && !path.startsWith('/login');
}

function schedulePublicRefresh(detail: any) {
  if (typeof window === 'undefined' || !isPublicRoute()) return;

  window.dispatchEvent(new CustomEvent('app_data_changed', { detail }));
  window.dispatchEvent(new CustomEvent(`table_updated_${detail.table}`, { detail }));

  // A full public remount guarantees every navbar page reads the authoritative
  // Supabase snapshot instead of an old IndexedDB render. Debounced so a batch
  // of changes produces one refresh only.
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    if (isPublicRoute()) window.location.reload();
  }, 500);
}

export function startGlobalRealtimeSync() {
  if (started || typeof window === 'undefined') return;
  started = true;

  channel = remoteSupabase
    .channel('pb-bilibili-public-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => schedulePublicRefresh({
        source: 'supabase-realtime',
        table: payload.table,
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      }),
    )
    .subscribe((status) => {
      window.dispatchEvent(new CustomEvent('supabase_realtime_status', { detail: { status } }));
    });

  window.addEventListener('beforeunload', () => {
    if (reloadTimer) clearTimeout(reloadTimer);
    if (channel) void remoteSupabase.removeChannel(channel);
  }, { once: true });
}

export const realtimeTables = PUBLIC_TABLES;
