import fs from 'node:fs';
import path from 'node:path';

// SUPABASE_POPUP_AUTH_PATCH_V4: Supabase is the single popup source of truth.
// Reads are direct, bounded, de-duplicated, realtime-safe, and preserve the
// currently visible popup when the realtime channel refreshes the list.
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
  if (source.includes('SUPABASE_POPUP_AUTH_V4')) return source;
  const block = /      let siteConfigRaw: any = null;[\s\S]*?      const shouldShow = activeItems\.length > 0 && \(forceShow \|\| !isDismissedRef\.current\);\n/;
  if (!block.test(source)) return source;
  const replacement = `      // SUPABASE_POPUP_AUTH_V4: konfigurasi_popup is the only runtime source of truth.\n      const { data: dbItems, error: dbError } = await supabase\n        .from('konfigurasi_popup')\n        .select('*')\n        .order('urutan', { ascending: true });\n\n      if (dbError) throw dbError;\n\n      const activeItems = Array.from(\n        new Map(\n          (Array.isArray(dbItems) ? dbItems : [])\n            .filter((item: any) => item && item.is_active === true && item.url_gambar)\n            .sort((a: any, b: any) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0))\n            .map((item: any) => [String(item.id), item])\n        ).values()\n      );\n\n      const shouldShow = activeItems.length > 0 && (forceShow || !isDismissedRef.current);\n`;
  return source.replace(block, replacement);
}, 'ImagePopup source of truth');

patchFile(imagePopupPath, (source) => {
  const realtimeBlock = /    const popupsChannel = supabase\n      \.channel\('popups-db-changes'\)[\s\S]*?      \.subscribe\(\);/;
  if (!realtimeBlock.test(source)) return source;
  const replacement = `    const popupsChannel = supabase\n      .channel('konfigurasi-popup-realtime')\n      .on(\n        'postgres_changes',\n        { event: '*', schema: 'public', table: 'konfigurasi_popup' },\n        () => { fetchActivePopups(false); }\n      )\n      .subscribe();`;
  return source.replace(realtimeBlock, replacement);
}, 'ImagePopup realtime');

// Preserve the currently visible popup across any Supabase realtime refresh.
patchFile(imagePopupPath, (source) => {
  if (source.includes('POPUP_PRESERVE_CURRENT_ON_REFRESH')) return source;
  const target = `      if (shouldShow) {\n        setPromoImages(activeItems);\n        setCurrentIndex(0);\n        setIsOpen(true);\n`;
  if (!source.includes(target)) return source;
  const replacement = `      if (shouldShow) {\n        // POPUP_PRESERVE_CURRENT_ON_REFRESH: realtime updates must not jump back to popup #1.\n        const currentPopupId = promoImages[currentIndex]?.id;\n        const preservedIndex = currentPopupId\n          ? activeItems.findIndex((item: any) => item && item.id === currentPopupId)\n          : -1;\n        setPromoImages(activeItems);\n        setCurrentIndex((prev) => {\n          if (preservedIndex >= 0) return preservedIndex;\n          return activeItems.length > 0 ? Math.min(prev, activeItems.length - 1) : 0;\n        });\n        setIsOpen(true);\n`;
  return source.replace(target, replacement);
}, 'ImagePopup current popup preservation');

patchFile(adminPopupPath, (source) => {
  if (source.includes('SUPABASE_POPUP_AUTH_V4')) return source;
  const block = /      let siteConfigRaw: any = null;[\s\S]*?      setPopups\(prev => \{[\s\S]*?      \}\);\n/;
  if (!block.test(source)) return source;
  const replacement = `      // SUPABASE_POPUP_AUTH_V4: direct, bounded, de-duplicated read from konfigurasi_popup.\n      if (popupFetchInFlight) return popupFetchInFlight;\n\n      const run = async () => {\n        const controller = new AbortController();\n        const timeout = setTimeout(() => controller.abort(), 8000);\n        try {\n          const { data: dbPopups, error: dbError } = await supabase\n            .from('konfigurasi_popup')\n            .select('id,url_gambar,judul,deskripsi,is_active,urutan,file_url')\n            .order('urutan', { ascending: true });\n\n          if (dbError) throw dbError;\n\n          const merged: PopupConfig[] = (Array.isArray(dbPopups) ? dbPopups : [])\n            .map((item: any) => ({\n              id: String(item.id),\n              url_gambar: item.url_gambar || '',\n              judul: item.judul || '',\n              deskripsi: item.deskripsi || '',\n              is_active: item.is_active === true,\n              urutan: Number(item.urutan ?? 0),\n              file_url: item.file_url || undefined,\n            }))\n            .filter(item => Boolean(item.id))\n            .sort((a, b) => {\n              if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;\n              return a.urutan - b.urutan;\n            });\n\n          setPopups(prev => {\n            const currentHash = JSON.stringify(prev);\n            const newHash = JSON.stringify(merged);\n            return currentHash === newHash ? prev : merged;\n          });\n        } catch (err) {\n          console.warn('[popup-supabase-authoritative] AdminPopup read failed:', err);\n        } finally {\n          clearTimeout(timeout);\n        }\n      };\n\n      popupFetchInFlight = run().finally(() => { popupFetchInFlight = null; });\n      return popupFetchInFlight;\n`;
  let next = source.replace(block, replacement);
  if (!next.includes('let popupFetchInFlight')) {
    next = next.replace(/  const sensors = useSensors\(\n/, `  let popupFetchInFlight: Promise<void> | null = null;\n\n  const sensors = useSensors(\n`);
  }
  return next;
}, 'AdminPopup direct Supabase read');

console.log('[popup-supabase-authoritative] v4 applied');
