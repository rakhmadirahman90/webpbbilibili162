import fs from 'node:fs';

const layoutPath = 'src/components/AdminLayout.tsx';
const kasPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';

let layout = fs.readFileSync(layoutPath, 'utf8');
layout = layout.replace(
  'className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain"',
  'className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain admin-main-scroll"'
);
fs.writeFileSync(layoutPath, layout, 'utf8');

let kas = fs.readFileSync(kasPath, 'utf8');
kas = kas.replace(
  /<div className="(?:kas-manager-root )?w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6[^\"]*select-none[^\"]*">/,
  '<div className="kas-manager-root w-full min-h-0 flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-visible select-none pb-28 md:pb-8">'
);
fs.writeFileSync(kasPath, kas, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_LAYOUT_FINAL_V1 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Final Kas layout: one reliable page-level scroll container, no clipped content. */\n.admin-main-scroll {\n  min-height: 0 !important;\n  height: 100% !important;\n  overflow-y: auto !important;\n  overflow-x: hidden !important;\n  overscroll-behavior: contain;\n  scrollbar-gutter: stable;\n}\n\n.admin-main-scroll > [data-kas-manager="true"],\n.admin-main-scroll > .kas-manager-root {\n  width: 100% !important;\n  max-width: 100% !important;\n  min-height: max-content !important;\n  height: auto !important;\n  flex: none !important;\n  overflow: visible !important;\n  box-sizing: border-box;\n}\n\n@media (max-width: 767px) {\n  .admin-main-scroll {\n    height: auto !important;\n    min-height: 0 !important;\n    overflow-y: auto !important;\n    overflow-x: hidden !important;\n    -webkit-overflow-scrolling: touch !important;\n    touch-action: pan-y !important;\n    overscroll-behavior-y: auto !important;\n    scrollbar-gutter: auto;\n  }\n\n  .admin-main-scroll > [data-kas-manager="true"],\n  .admin-main-scroll > .kas-manager-root {\n    display: flex !important;\n    width: 100% !important;\n    min-width: 0 !important;\n    min-height: max-content !important;\n    height: auto !important;\n    flex: none !important;\n    overflow: visible !important;\n    padding-bottom: max(120px, env(safe-area-inset-bottom)) !important;\n  }\n\n  .admin-main-scroll > [data-kas-manager="true"] > *,\n  .admin-main-scroll > .kas-manager-root > * {\n    min-width: 0 !important;\n    max-width: 100% !important;\n  }\n\n  .admin-main-scroll .kas-manager-header,\n  .admin-main-scroll .kas-date-filter {\n    width: 100% !important;\n    min-width: 0 !important;\n  }\n\n  .admin-main-scroll table {\n    min-width: 760px;\n  }\n\n  /* If a transaction/list panel has an old fixed viewport height, let the page own scrolling. */\n  .admin-main-scroll [class*="max-h-"] {\n    max-height: none !important;\n  }\n\n  .admin-main-scroll .overflow-y-auto:not(.admin-main-scroll) {\n    overflow-y: visible !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-layout-final] applied page-level scrolling and unclipped Kas layout');
