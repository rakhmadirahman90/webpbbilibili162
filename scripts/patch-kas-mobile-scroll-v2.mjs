import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const layoutPath = 'src/components/AdminLayout.tsx';
const cssPath = 'src/index.css';

// Mobile Kas must use the AdminLayout page scroll. Remove the nested 85vh
// ledger/form constraints that clip transaction history on small screens.
let kas = fs.readFileSync(componentPath, 'utf8');
kas = kas.replace(
  '<div className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto select-none pb-28 md:pb-8">',
  '<div className="kas-manager-root w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-visible select-none pb-28 md:pb-8">'
);
kas = kas.replace(
  'grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0 items-stretch pb-10 md:pb-0',
  'grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 md:flex-1 md:min-h-0 items-stretch pb-10 md:pb-0'
);
kas = kas.replace(
  'bg-[#0b1224]/90 border border-white/10 p-3 sm:p-5 rounded-2xl md:rounded-[2.5rem] flex flex-col h-auto max-h-[85vh] md:h-full min-h-0 overflow-y-auto shadow-xl',
  'bg-[#0b1224]/90 border border-white/10 p-3 sm:p-5 rounded-2xl md:rounded-[2.5rem] flex flex-col h-auto max-h-none md:max-h-[85vh] md:h-full min-h-0 overflow-visible md:overflow-y-auto shadow-xl'
);
kas = kas.replace(
  'bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col h-auto max-h-[85vh] md:h-full min-h-0 shadow-xl',
  'bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-visible md:overflow-hidden flex flex-col h-auto max-h-none md:max-h-[85vh] md:h-full min-h-0 shadow-xl'
);
kas = kas.replace(
  '<div className="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5">',
  '<div className="overflow-visible md:overflow-y-auto md:flex-1 md:min-h-0 divide-y divide-white/5">'
);
fs.writeFileSync(componentPath, kas, 'utf8');

// Preserve the realtime Kas notifier with its WhatsApp report CTA.
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
const marker = '/* KAS_MANAGER_MOBILE_SCROLL_V2_FINAL */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width: 767px) {\n  .admin-main { overflow-y:auto !important; overflow-x:hidden !important; min-height:0 !important; height:auto !important; touch-action:pan-y !important; -webkit-overflow-scrolling:touch !important; overscroll-behavior-y:auto !important; }\n  .kas-manager-root { display:block !important; width:100% !important; max-width:100% !important; height:auto !important; min-height:max-content !important; overflow:visible !important; flex:none !important; padding-bottom:max(104px,env(safe-area-inset-bottom)) !important; }\n  .kas-manager-root > .grid { display:block !important; height:auto !important; min-height:0 !important; overflow:visible !important; }\n  .kas-manager-root > .grid > div { display:block !important; width:100% !important; height:auto !important; min-height:0 !important; overflow:visible !important; margin-bottom:12px !important; }\n  .kas-manager-root > .grid > div > div { height:auto !important; max-height:none !important; min-height:0 !important; overflow:visible !important; }\n  .kas-manager-root > .grid > div > div > div.overflow-visible { height:auto !important; max-height:none !important; min-height:0 !important; overflow:visible !important; flex:none !important; }\n  .kas-manager-root input, .kas-manager-root select, .kas-manager-root textarea { font-size:16px !important; }\n  .kas-manager-root button { touch-action:manipulation !important; }\n  .kas-manager-root input[type="date"] { min-width:0 !important; width:100% !important; max-width:100% !important; }\n}\n@media (max-width:390px) { .kas-manager-root { padding-left:8px !important; padding-right:8px !important; } }\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-mobile-scroll-v2] final mobile Kas scroll fix applied');
