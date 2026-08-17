import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
let source = fs.readFileSync(file, 'utf8');

const effectStart = source.indexOf('  useEffect(() => {');
const persistStart = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {', effectStart);
if (effectStart < 0 || persistStart < 0) {
  throw new Error('[popup-admin-realtime] useEffect boundary not found');
}

const stableEffect = `  useEffect(() => {\n    let refreshTimer: ReturnType<typeof setTimeout> | null = null;\n\n    const refresh = () => {\n      if (refreshTimer) clearTimeout(refreshTimer);\n      refreshTimer = setTimeout(() => {\n        refreshTimer = null;\n        void fetchPopups(true);\n      }, 150);\n    };\n\n    void fetchPopups(false);\n\n    const channel = supabase\n      .channel('admin_popup_config_realtime')\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, refresh)\n      .subscribe();\n\n    const handleRefresh = () => refresh();\n    window.addEventListener('table_updated_konfigurasi_popup', handleRefresh);\n    window.addEventListener('online', handleRefresh);\n\n    return () => {\n      if (refreshTimer) clearTimeout(refreshTimer);\n      supabase.removeChannel(channel);\n      window.removeEventListener('table_updated_konfigurasi_popup', handleRefresh);\n      window.removeEventListener('online', handleRefresh);\n    };\n  }, []);\n\n`;

source = source.slice(0, effectStart) + stableEffect + source.slice(persistStart);
source = source.replace('totalCount={popups.length}', 'totalCount={popups.filter(p => p.is_active === item.is_active).length}');

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-admin-realtime] fast realtime refresh applied');
