import fs from 'node:fs';
import path from 'node:path';

const imagePopupPath = path.resolve('src/components/ImagePopup.tsx');
const adminPopupPath = path.resolve('src/components/AdminPopup.tsx');

function patchFile(filePath, transform, label) {
  const source = fs.readFileSync(filePath, 'utf8');
  const next = transform(source);
  if (next === source) {
    console.log(`[popup-supabase-authoritative] ${label}: already patched`);
    return;
  }
  fs.writeFileSync(filePath, next, 'utf8');
  console.log(`[popup-supabase-authoritative] ${label}: patched`);
}

patchFile(imagePopupPath, (source) => {
  if (source.includes('SUPABASE_POPUP_AUTH_V1')) return source;
  const block = /      let siteConfigRaw: any = null;[\s\S]*?      const shouldShow = activeItems\.length > 0 && \(forceShow \|\| !isDismissedRef\.current\);\n/;
  if (!block.test(source)) throw new Error('ImagePopup source block not found');
  const replacement = `      // SUPABASE_POPUP_AUTH_V1: konfigurasi_popup is the only runtime source of truth.\n      const { data: dbItems, error: dbError } = await supabase\n        .from('konfigurasi_popup')\n        .select('*')\n        .order('urutan', { ascending: true });\n\n      if (dbError) throw dbError;\n\n      const activeItems = (Array.isArray(dbItems) ? dbItems : [])\n        .filter((item: any) => item && item.is_active === true && item.url_gambar)\n        .sort((a: any, b: any) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));\n\n      const shouldShow = activeItems.length > 0 && (forceShow || !isDismissedRef.current);\n`;
  return source.replace(block, replacement);
}, 'ImagePopup source of truth');

patchFile(imagePopupPath, (source) => {
  const realtimeBlock = /    const popupsChannel = supabase\n      \.channel\('popups-db-changes'\)[\s\S]*?      \.subscribe\(\);/;
  if (!realtimeBlock.test(source)) return source;
  const replacement = `    const popupsChannel = supabase\n      .channel('konfigurasi-popup-realtime')\n      .on(\n        'postgres_changes',\n        { event: '*', schema: 'public', table: 'konfigurasi_popup' },\n        () => { fetchActivePopups(true); }\n      )\n      .subscribe();`;
  return source.replace(realtimeBlock, replacement);
}, 'ImagePopup realtime');

patchFile(adminPopupPath, (source) => {
  if (source.includes('SUPABASE_POPUP_AUTH_V1')) return source;
  const block = /      let siteConfigRaw: any = null;[\s\S]*?      setPopups\(prev => \{[\s\S]*?      \}\);\n/;
  if (!block.test(source)) throw new Error('AdminPopup fetch block not found');
  const replacement = `      // SUPABASE_POPUP_AUTH_V1: Admin UI reads exactly what production popup uses.\n      const { data: dbPopups, error: dbError } = await supabase\n        .from('konfigurasi_popup')\n        .select('*')\n        .order('urutan', { ascending: true });\n\n      if (dbError) throw dbError;\n\n      const merged: PopupConfig[] = (Array.isArray(dbPopups) ? dbPopups : [])\n        .map((item: any) => ({\n          id: String(item.id),\n          url_gambar: item.url_gambar || '',\n          judul: item.judul || '',\n          deskripsi: item.deskripsi || '',\n          is_active: item.is_active === true,\n          urutan: Number(item.urutan ?? 0),\n          file_url: item.file_url || undefined,\n        }))\n        .sort((a, b) => a.urutan - b.urutan);\n\n      setPopups(prev => {\n        const currentHash = JSON.stringify(prev);\n        const newHash = JSON.stringify(merged);\n        return currentHash === newHash ? prev : merged;\n      });\n`;
  return source.replace(block, replacement);
}, 'AdminPopup read path');

// Keep the patch intentionally limited to popup read/realtime behavior; persistence is handled by the existing popup-save patch.
