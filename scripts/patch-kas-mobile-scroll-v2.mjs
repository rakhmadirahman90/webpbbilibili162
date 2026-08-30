import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const layoutPath = 'src/components/AdminLayout.tsx';
const cssPath = 'src/index.css';

let kas = fs.readFileSync(componentPath, 'utf8');

// Mobile: use one normal document flow. Desktop keeps its split/scroll layout.
kas = kas.replace(
  /<div className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 [^"]*select-none pb-28 md:pb-8">/,
  '<div className="kas-manager-root w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-visible select-none pb-28 md:pb-8">'
);
kas = kas.replace(
  'grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0 items-stretch pb-10 md:pb-0',
  'grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 md:flex-1 md:min-h-0 items-stretch pb-10 md:pb-0'
);
kas = kas.replace(
  'max-h-[85vh] md:h-full min-h-0 overflow-y-auto shadow-xl',
  'max-h-none md:max-h-[85vh] md:h-full min-h-0 overflow-visible md:overflow-y-auto shadow-xl'
);
kas = kas.replace(
  'overflow-hidden flex flex-col h-auto max-h-[85vh] md:h-full min-h-0 shadow-xl',
  'overflow-visible md:overflow-hidden flex flex-col h-auto max-h-none md:max-h-[85vh] md:h-full min-h-0 shadow-xl'
);
kas = kas.replace(
  '<div className="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5">',
  '<div className="overflow-visible md:overflow-y-auto md:flex-1 md:min-h-0 divide-y divide-white/5">'
);
fs.writeFileSync(componentPath, kas, 'utf8');

// Keep the existing realtime notifier mounted on the Kas route.
let layout = fs.readFileSync(layoutPath, 'utf8');
if (!layout.includes("import KasRealtimeNotifier from './KasRealtimeNotifier';")) {
  layout = layout.replace(
    "import AdminRouteView from './AdminRouteView';",
    "import AdminRouteView from './AdminRouteView';\nimport KasRealtimeNotifier from './KasRealtimeNotifier';"
  );
}
if (!layout.includes('<KasRealtimeNotifier />')) {
  layout = layout.replace(
    '<main className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">',
    '<main className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">\n          {location.pathname.toLowerCase().startsWith(\'/admin/kas\') && <KasRealtimeNotifier />} '
  );
}
fs.writeFileSync(layoutPath, layout, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_MANAGER_MOBILE_UI_V4 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Premium mobile Kas: one page flow, no clipped history, no nested scroller. */\n@media (max-width: 767px) {\n  .admin-main {\n    overflow-y: auto !important;\n    overflow-x: hidden !important;\n    min-height: 0 !important;\n    height: auto !important;\n    touch-action: pan-y !important;\n    -webkit-overflow-scrolling: touch !important;\n    overscroll-behavior-y: auto !important;\n    background: #f6f8fc !important;\n  }\n\n  .kas-manager-root {\n    display: block !important;\n    width: 100% !important;\n    max-width: 100% !important;\n    height: auto !important;\n    min-height: max-content !important;\n    overflow: visible !important;\n    flex: none !important;\n    padding: 12px 12px max(112px, env(safe-area-inset-bottom)) !important;\n    color: #0f172a !important;\n  }\n\n  /* Do not let the old v3 rule force the hidden mobile tab to display. */\n  .kas-manager-root > .grid > div.hidden {\n    display: none !important;\n  }\n  .kas-manager-root > .grid > div.flex {\n    display: block !important;\n    width: 100% !important;\n    height: auto !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n    margin: 0 0 14px !important;\n  }\n\n  .kas-manager-root > .grid {\n    display: block !important;\n    height: auto !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n  }\n\n  .kas-manager-root > .grid > div > div {\n    height: auto !important;\n    max-height: none !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n  }\n\n  .kas-manager-root > .grid > div > div > div.overflow-visible {\n    height: auto !important;\n    max-height: none !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n    flex: none !important;\n  }\n\n  /* Compact, elegant mobile cards. */\n  .kas-manager-root > div {\n    border-radius: 18px !important;\n  }\n\n  .kas-manager-root .bg-slate-800\\/60,\n  .kas-manager-root .bg-emerald-500\\/10,\n  .kas-manager-root .bg-red-500\\/10,\n  .kas-manager-root .bg-blue-500\\/10 {\n    box-shadow: 0 5px 18px rgba(15,23,42,.06) !important;\n    backdrop-filter: blur(10px);\n  }\n\n  /* Make the filter feel like a clean control panel. */\n  .kas-manager-root .kas-date-filter {\n    border-radius: 20px !important;\n    box-shadow: 0 8px 24px rgba(15,23,42,.10) !important;\n  }\n\n  /* Transaction ledger: full height in page flow; every row and pagination remain reachable. */\n  .kas-manager-root [class*="Transaction_Ledger"],\n  .kas-manager-root .overflow-visible {\n    max-height: none !important;\n  }\n\n  .kas-manager-root input,\n  .kas-manager-root select,\n  .kas-manager-root textarea {\n    font-size: 16px !important;\n    min-height: 46px;\n  }\n\n  .kas-manager-root textarea { min-height: 82px; }\n\n  .kas-manager-root button {\n    min-height: 42px;\n    touch-action: manipulation !important;\n  }\n\n  .kas-manager-root input[type="date"] {\n    min-width: 0 !important;\n    width: 100% !important;\n    max-width: 100% !important;\n  }\n\n  /* Keep the mobile tabs sticky just below the admin header while scrolling. */\n  .kas-manager-root > .flex.md\\:hidden {\n    position: sticky !important;\n    top: 0 !important;\n    z-index: 20 !important;\n    margin-bottom: 4px !important;\n    background: rgba(15,23,42,.96) !important;\n    backdrop-filter: blur(14px);\n    box-shadow: 0 8px 20px rgba(15,23,42,.14) !important;\n  }\n\n  /* Transaction rows read like compact premium cards instead of a cramped table. */\n  .kas-manager-root .divide-y > div {\n    padding: 13px 12px !important;\n  }\n}\n\n@media (max-width: 390px) {\n  .kas-manager-root {\n    padding-left: 8px !important;\n    padding-right: 8px !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-mobile-scroll-v2] premium mobile UI v4 applied: single page flow + complete history');
