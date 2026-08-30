import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const layoutPath = 'src/components/AdminLayout.tsx';
const cssPath = 'src/index.css';

// The admin shell is a fixed 100dvh flex layout. KasManager must therefore
// expose its full mobile content height to the shell's scrolling <main>,
// rather than creating a nested/shrinking flex region.
let kas = fs.readFileSync(componentPath, 'utf8');
const rootFrom = 'kas-manager-root w-full min-h-full flex flex-col';
const rootTo = 'kas-manager-root w-full min-h-full flex flex-col';
if (!kas.includes('kas-manager-root')) {
  kas = kas.replace(
    'w-full min-h-full flex flex-col',
    rootTo
  );
}
fs.writeFileSync(componentPath, kas, 'utf8');

// Mount the existing realtime Kas notifier on the Kas admin route. It already
// contains the WhatsApp report CTA and FCM/realtime handling; this makes sure
// the feature is actually active when the admin opens /admin/kas.
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
    '<main className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">\n          {location.pathname.toLowerCase().startsWith(\'/admin/kas\') && <KasRealtimeNotifier />}'
  );
}
fs.writeFileSync(layoutPath, layout, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_MANAGER_MOBILE_SCROLL_V2 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Let the AdminLayout main element be the single vertical scroller on phones. */\n.admin-main {\n  min-height: 0 !important;\n  overscroll-behavior-y: auto !important;\n  -webkit-overflow-scrolling: touch !important;\n}\n\n@media (max-width: 767px) {\n  .admin-main {\n    height: auto !important;\n    overflow-y: auto !important;\n    overflow-x: hidden !important;\n    touch-action: pan-y !important;\n  }\n\n  .kas-manager-root {\n    display: flex !important;\n    flex-direction: column !important;\n    flex: 0 0 auto !important;\n    width: 100% !important;\n    max-width: 100% !important;\n    height: auto !important;\n    min-height: max-content !important;\n    overflow: visible !important;\n    padding-bottom: max(88px, env(safe-area-inset-bottom)) !important;\n    touch-action: pan-y !important;\n  }\n\n  .kas-manager-root > * {\n    flex: 0 0 auto !important;\n  }\n\n  .kas-manager-root > .grid {\n    flex: 0 0 auto !important;\n    height: auto !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n  }\n\n  .kas-manager-root .kas-stat-grid {\n    flex: 0 0 auto !important;\n  }\n\n  .kas-manager-root .kas-date-filter {\n    flex: 0 0 auto !important;\n  }\n\n  .kas-manager-root .kas-date-controls input[type="date"] {\n    min-width: 0 !important;\n    width: 100% !important;\n    max-width: 100% !important;\n  }\n\n  /* The transaction/form panels should grow naturally on mobile. */\n  .kas-manager-root .lg\\:col-span-4,\n  .kas-manager-root .lg\\:col-span-8 {\n    min-height: 0 !important;\n    height: auto !important;\n    overflow: visible !important;\n  }\n\n  .kas-manager-root .lg\\:col-span-4 > div,\n  .kas-manager-root .lg\\:col-span-8 > div {\n    max-height: none !important;\n    height: auto !important;\n    min-height: 0 !important;\n  }\n\n  /* Keep mobile tab content usable without creating a second page scroller. */\n  .kas-manager-root [class*="overflow-y-auto"] {\n    -webkit-overflow-scrolling: touch;\n  }\n}\n\n@media (max-width: 390px) {\n  .kas-manager-root {\n    padding-left: 8px !important;\n    padding-right: 8px !important;\n    padding-bottom: max(96px, env(safe-area-inset-bottom)) !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-mobile-scroll-v2] applied single-scroll mobile layout and Kas realtime notifier');
