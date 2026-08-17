import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
let source = fs.readFileSync(file, 'utf8');

const effectStart = source.indexOf('  useEffect(() => {');
const persistStart = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {', effectStart);
if (effectStart < 0 || persistStart < 0) {
  throw new Error('[popup-admin-realtime] useEffect boundary not found');
}

const stableEffect = `  useEffect(() => {\n    fetchPopups(false);\n\n    const channel = supabase\n      .channel('admin_popup_config_realtime')\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => {\n        fetchPopups(true);\n      })\n      .subscribe();\n\n    const handleRefresh = () => fetchPopups(true);\n    window.addEventListener('table_updated_konfigurasi_popup', handleRefresh);\n    window.addEventListener('online', handleRefresh);\n\n    return () => {\n      supabase.removeChannel(channel);\n      window.removeEventListener('table_updated_konfigurasi_popup', handleRefresh);\n      window.removeEventListener('online', handleRefresh);\n    };\n  }, []);\n\n`;

source = source.slice(0, effectStart) + stableEffect + source.slice(persistStart);
source = source.replace('totalCount={popups.length}', 'totalCount={popups.filter(p => p.is_active === item.is_active).length}');

fs.writeFileSync(file, source);
console.log('[popup-admin-realtime] applied');
