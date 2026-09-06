import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';

let src = fs.readFileSync(componentPath, 'utf8');

// Supabase UPDATE/DELETE can legitimately return zero rows to the client after the mutation.
// Do not chain .select().single() to these mutations; it is the source of
// "Cannot coerce the result to a single JSON object" in the mobile/admin flow.
const updatePattern = /const \{ data, error \} = await supabase\.from\('kas_pb'\)\.update\(finalData\)\.eq\('id', editingId\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*await broadcastKasChange\('UPDATE', data \|\| \{ id: editingId, \.\.\.finalData \}\);/;
if (updatePattern.test(src)) {
  src = src.replace(updatePattern, "const { error } = await supabase.from('kas_pb').update(finalData).eq('id', editingId); if (error) throw error;\n        await broadcastKasChange('UPDATE', { id: editingId, ...finalData });
");
  console.log('[patch-kas-crud-mobile-safe] UPDATE mutation fixed');
} else if (src.includes(".update(finalData).eq('id', editingId).select().single()")) {
  console.warn('[patch-kas-crud-mobile-safe] UPDATE still contains select().single(); inspect source formatting');
}

const deletePattern = /const \{ data, error \} = await supabase\.from\('kas_pb'\)\.delete\(\)\.eq\('id', row\.id\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*await broadcastKasChange\('DELETE', data \|\| row\);/;
if (deletePattern.test(src)) {
  src = src.replace(deletePattern, "const { error } = await supabase.from('kas_pb').delete().eq('id', row.id); if (error) throw error; await broadcastKasChange('DELETE', row);");
  console.log('[patch-kas-crud-mobile-safe] DELETE mutation fixed');
} else if (src.includes(".delete().eq('id', row.id).select().single()")) {
  console.warn('[patch-kas-crud-mobile-safe] DELETE still contains select().single(); inspect source formatting');
}

fs.writeFileSync(componentPath, src, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_CRUD_MOBILE_SAFE_V2 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Kelola Kas: true single-screen mobile layout. No horizontal page spill. */\n.kas-manager-root,\n.kas-manager-root * {\n  box-sizing: border-box;\n}\n\n.kas-manager-root {\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n  overflow-x: hidden;\n}\n\n@media (max-width: 767px) {\n  .kas-manager-root {\n    width: 100% !important;\n    max-width: 100vw !important;\n    min-width: 0 !important;\n    overflow-x: hidden !important;\n    padding-left: 6px !important;\n    padding-right: 6px !important;\n  }\n\n  .kas-manager-root > * {\n    width: 100% !important;\n    max-width: 100% !important;\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root header,\n  .kas-manager-root section,\n  .kas-manager-root form,\n  .kas-manager-root label,\n  .kas-manager-root .grid,\n  .kas-manager-root .flex {\n    min-width: 0 !important;\n    max-width: 100% !important;\n  }\n\n  .kas-manager-root input,\n  .kas-manager-root select,\n  .kas-manager-root textarea {\n    width: 100% !important;\n    min-width: 0 !important;\n    max-width: 100% !important;\n  }\n\n  .kas-manager-root button {\n    max-width: 100% !important;\n    min-width: 0;\n  }\n\n  /* Date/filter controls stack instead of forcing the page wider. */\n  .kas-manager-root section .flex.flex-wrap {\n    min-width: 0 !important;\n  }\n\n  /* The desktop 850px table is replaced by compact transaction cards on mobile. */\n  .kas-manager-root table {\n    display: block !important;\n    width: 100% !important;\n    min-width: 0 !important;\n    max-width: 100% !important;\n    table-layout: auto !important;\n  }\n\n  .kas-manager-root thead {\n    display: none !important;\n  }\n\n  .kas-manager-root tbody {\n    display: block !important;\n    width: 100% !important;\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root tbody tr {\n    display: grid !important;\n    grid-template-columns: minmax(0, 1fr) auto !important;\n    gap: 4px 8px !important;\n    width: 100% !important;\n    min-width: 0 !important;\n    max-width: 100% !important;\n    padding: 10px !important;\n    overflow: hidden !important;\n    border-top: 1px solid rgba(255,255,255,.06);\n  }\n\n  .kas-manager-root tbody td {\n    display: block !important;\n    width: auto !important;\n    min-width: 0 !important;\n    max-width: 100% !important;\n    padding: 1px 0 !important;\n    overflow-wrap: anywhere !important;\n    word-break: break-word !important;\n    white-space: normal !important;\n  }\n\n  .kas-manager-root tbody td:nth-child(1) { grid-column: 1; grid-row: 1; color: #94a3b8 !important; }\n  .kas-manager-root tbody td:nth-child(2) { grid-column: 1; grid-row: 2; font-size: 11px !important; }\n  .kas-manager-root tbody td:nth-child(3) { grid-column: 1; grid-row: 3; color: #94a3b8 !important; }\n  .kas-manager-root tbody td:nth-child(4) { grid-column: 1; grid-row: 4; }\n  .kas-manager-root tbody td:nth-child(5) { grid-column: 2; grid-row: 1 / span 3; text-align: right !important; align-self: center; white-space: nowrap !important; }\n  .kas-manager-root tbody td:nth-child(6) { grid-column: 1; grid-row: 5; color: #94a3b8 !important; }\n  .kas-manager-root tbody td:nth-child(7) { grid-column: 1; grid-row: 6; color: #94a3b8 !important; }\n  .kas-manager-root tbody td:nth-child(8) { grid-column: 2; grid-row: 6; align-self: end; }\n\n  .kas-manager-root tbody td:nth-child(4) span {\n    display: inline-flex !important;\n    max-width: 100% !important;\n    white-space: nowrap !important;\n  }\n\n  .kas-manager-root tbody td:nth-child(8) > div {\n    display: flex !important;\n    justify-content: flex-end !important;\n    gap: 6px !important;\n    min-width: 0 !important;\n  }\n\n  .kas-manager-root tbody td:nth-child(8) button {\n    flex: 0 0 38px !important;\n    width: 38px !important;\n    min-width: 38px !important;\n    max-width: 38px !important;\n    height: 38px !important;\n    padding: 0 !important;\n  }\n\n  .kas-manager-root [class*="overflow-x-auto"] {\n    width: 100% !important;\n    max-width: 100% !important;\n    overflow-x: hidden !important;\n  }\n\n  .kas-manager-root .truncate {\n    white-space: normal !important;\n    overflow: visible !important;\n    text-overflow: clip !important;\n    overflow-wrap: anywhere !important;\n  }\n\n  .kas-manager-root .max-h-\\[85vh\\] {\n    max-height: none !important;\n  }\n}\n\n@media (max-width: 390px) {\n  .kas-manager-root {\n    padding-left: 4px !important;\n    padding-right: 4px !important;\n  }\n\n  .kas-manager-root tbody tr {\n    padding: 8px !important;\n    gap: 3px 6px !important;\n  }\n\n  .kas-manager-root tbody td:nth-child(5) {\n    font-size: 9px !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-crud-mobile-safe] V2 applied');
