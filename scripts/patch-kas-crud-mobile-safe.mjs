import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';
let src = fs.readFileSync(componentPath, 'utf8');

const updatePattern = /const \{ data, error \} = await supabase\.from\('kas_pb'\)\.update\(finalData\)\.eq\('id', editingId\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*await broadcastKasChange\('UPDATE', data \|\| \{ id: editingId, \.\.\.finalData \}\);/;
if (updatePattern.test(src)) {
  src = src.replace(updatePattern, `const { error } = await supabase.from('kas_pb').update(finalData).eq('id', editingId); if (error) throw error;
        await broadcastKasChange('UPDATE', { id: editingId, ...finalData });`);
  console.log('[patch-kas-crud-mobile-safe] UPDATE mutation fixed');
}

const deletePattern = /const \{ data, error \} = await supabase\.from\('kas_pb'\)\.delete\(\)\.eq\('id', row\.id\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*await broadcastKasChange\('DELETE', data \|\| row\);/;
if (deletePattern.test(src)) {
  src = src.replace(deletePattern, `const { error } = await supabase.from('kas_pb').delete().eq('id', row.id); if (error) throw error; await broadcastKasChange('DELETE', row);`);
  console.log('[patch-kas-crud-mobile-safe] DELETE mutation fixed');
}
fs.writeFileSync(componentPath, src, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_CRUD_MOBILE_SAFE_V3 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.kas-manager-root,.kas-manager-root *{box-sizing:border-box}\n.kas-manager-root{width:100%;max-width:100%;min-width:0;overflow-x:hidden}\n@media(max-width:767px){\n.kas-manager-root{width:100%!important;max-width:100vw!important;min-width:0!important;overflow-x:hidden!important;padding-left:6px!important;padding-right:6px!important}\n.kas-manager-root>*,.kas-manager-root header,.kas-manager-root section,.kas-manager-root form,.kas-manager-root label,.kas-manager-root .grid,.kas-manager-root .flex{min-width:0!important;max-width:100%!important}\n.kas-manager-root input,.kas-manager-root select,.kas-manager-root textarea{width:100%!important;min-width:0!important;max-width:100%!important}\n.kas-manager-root table{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important}\n.kas-manager-root thead{display:none!important}\n.kas-manager-root tbody{display:block!important;width:100%!important;min-width:0!important}\n.kas-manager-root tbody tr{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:4px 8px!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:10px!important;overflow:hidden!important}\n.kas-manager-root tbody td{display:block!important;width:auto!important;min-width:0!important;max-width:100%!important;padding:1px 0!important;overflow-wrap:anywhere!important;word-break:break-word!important;white-space:normal!important}\n.kas-manager-root tbody td:nth-child(1){grid-column:1;grid-row:1}.kas-manager-root tbody td:nth-child(2){grid-column:1;grid-row:2;font-size:11px!important}.kas-manager-root tbody td:nth-child(3){grid-column:1;grid-row:3}.kas-manager-root tbody td:nth-child(4){grid-column:1;grid-row:4}.kas-manager-root tbody td:nth-child(5){grid-column:2;grid-row:1/span 3;text-align:right!important;align-self:center;white-space:nowrap!important}.kas-manager-root tbody td:nth-child(6){grid-column:1;grid-row:5}.kas-manager-root tbody td:nth-child(7){grid-column:1;grid-row:6}.kas-manager-root tbody td:nth-child(8){grid-column:2;grid-row:6;align-self:end}\n.kas-manager-root tbody td:nth-child(8)>div{display:flex!important;justify-content:flex-end!important;gap:6px!important;min-width:0!important}.kas-manager-root tbody td:nth-child(8) button{flex:0 0 38px!important;width:38px!important;min-width:38px!important;max-width:38px!important;height:38px!important;padding:0!important}.kas-manager-root [class*=\"overflow-x-auto\"]{width:100%!important;max-width:100%!important;overflow-x:hidden!important}.kas-manager-root .truncate{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important}\n}\n@media(max-width:390px){.kas-manager-root{padding-left:4px!important;padding-right:4px!important}.kas-manager-root tbody tr{padding:8px!important;gap:3px 6px!important}}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}
console.log('[patch-kas-crud-mobile-safe] V3 applied');
