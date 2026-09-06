import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';

let src = fs.readFileSync(componentPath, 'utf8');

const updateOld = "const { data, error } = await supabase.from('kas_pb').update(finalData).eq('id', editingId).select().single(); if (error) throw error;\n        await broadcastKasChange('UPDATE', data || { id: editingId, ...finalData });";
const updateNew = "const { error } = await supabase.from('kas_pb').update(finalData).eq('id', editingId); if (error) throw error;\n        await broadcastKasChange('UPDATE', { id: editingId, ...finalData });";

const deleteOld = "const { data, error } = await supabase.from('kas_pb').delete().eq('id', row.id).select().single(); if (error) throw error; await broadcastKasChange('DELETE', data || row);";
const deleteNew = "const { error } = await supabase.from('kas_pb').delete().eq('id', row.id); if (error) throw error; await broadcastKasChange('DELETE', row);";

if (src.includes(updateOld)) {
  src = src.replace(updateOld, updateNew);
  console.log('[patch-kas-crud-mobile-safe] update now uses mutation result without single-object coercion');
} else if (!src.includes(".update(finalData).eq('id', editingId);")) {
  console.warn('[patch-kas-crud-mobile-safe] update pattern not found');
}

if (src.includes(deleteOld)) {
  src = src.replace(deleteOld, deleteNew);
  console.log('[patch-kas-crud-mobile-safe] delete now uses mutation result without single-object coercion');
} else if (!src.includes(".delete().eq('id', row.id);")) {
  console.warn('[patch-kas-crud-mobile-safe] delete pattern not found');
}

fs.writeFileSync(componentPath, src, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_CRUD_MOBILE_SAFE_V1 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Final mobile rules for Kelola Kas: one page, no horizontal spill, stable edit/delete controls. */\n.kas-manager-root,\n.kas-manager-root * {\n  box-sizing: border-box;\n}\n\n.kas-manager-root {\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n  overflow-x: hidden;\n}\n\n@media (max-width: 767px) {\n  .kas-manager-root {\n    width: 100% !important;\n    max-width: 100% !important;\n    min-width: 0 !important;\n    overflow-x: hidden !important;\n    padding-left: 8px !important;\n    padding-right: 8px !important;\n  }\n\n  .kas-manager-root > * {\n    width: 100% !important;\n    max-width: 100% !important;\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root .grid {\n    min-width: 0 !important;\n    max-width: 100% !important;\n  }\n\n  .kas-manager-root input,\n  .kas-manager-root select,\n  .kas-manager-root textarea,\n  .kas-manager-root button {\n    max-width: 100% !important;\n  }\n\n  .kas-manager-root input,\n  .kas-manager-root select,\n  .kas-manager-root textarea {\n    width: 100%;\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root .kas-action-btn {\n    width: 100% !important;\n    min-width: 0 !important;\n    white-space: normal !important;\n    overflow-wrap: anywhere;\n  }\n\n  .kas-manager-root .divide-y > div {\n    width: 100% !important;\n    max-width: 100% !important;\n    min-width: 0 !important;\n    overflow: hidden !important;\n  }\n\n  .kas-manager-root .divide-y > div * {\n    min-width: 0 !important;\n    max-width: 100% !important;\n    overflow-wrap: anywhere;\n  }\n\n  .kas-manager-root table {\n    width: 100% !important;\n    min-width: 0 !important;\n    max-width: 100% !important;\n    table-layout: fixed !important;\n  }\n\n  .kas-manager-root th,\n  .kas-manager-root td {\n    max-width: 0 !important;\n    overflow-wrap: anywhere !important;\n    word-break: break-word !important;\n  }\n\n  .kas-manager-root [class*="overflow-x-auto"] {\n    max-width: 100% !important;\n    overflow-x: hidden !important;\n  }\n\n  .kas-manager-root .flex {\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root .flex > * {\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root .truncate {\n    white-space: normal !important;\n    overflow-wrap: anywhere !important;\n    text-overflow: clip !important;\n  }\n\n  /* Keep edit/delete buttons compact and aligned inside each transaction row. */\n  .kas-manager-root button[title*="Edit"],\n  .kas-manager-root button[title*="Hapus"],\n  .kas-manager-root button[aria-label*="Edit"],\n  .kas-manager-root button[aria-label*="Hapus"] {\n    flex: 0 0 46px !important;\n    width: 46px !important;\n    min-width: 46px !important;\n    max-width: 46px !important;\n    padding-left: 0 !important;\n    padding-right: 0 !important;\n  }\n}\n\n@media (max-width: 390px) {\n  .kas-manager-root {\n    padding-left: 6px !important;\n    padding-right: 6px !important;\n  }\n\n  .kas-manager-root .divide-y > div {\n    padding-left: 10px !important;\n    padding-right: 10px !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-crud-mobile-safe] applied');
