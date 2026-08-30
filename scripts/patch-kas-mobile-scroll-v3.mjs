import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';

// Give the Kas page a stable root hook so mobile CSS can remove the nested
// ledger scroller without depending on fragile Tailwind utility selectors.
let kas = fs.readFileSync(componentPath, 'utf8');
kas = kas.replace(
  '<div className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto select-none pb-28 md:pb-8">',
  '<div className="kas-manager-root w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-visible select-none pb-28 md:pb-8">'
);
fs.writeFileSync(componentPath, kas, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_MANAGER_MOBILE_SCROLL_V3 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* MOBILE KAS: one page scroller, no clipped/nested transaction history. */\n@media (max-width: 767px) {\n  /* The AdminLayout <main> is the only vertical scroller. */\n  .admin-main {\n    overflow-y: auto !important;\n    overflow-x: hidden !important;\n    min-height: 0 !important;\n    height: auto !important;\n    touch-action: pan-y !important;\n    -webkit-overflow-scrolling: touch !important;\n    overscroll-behavior-y: auto !important;\n  }\n\n  .kas-manager-root {\n    display: block !important;\n    width: 100% !important;\n    max-width: 100% !important;\n    height: auto !important;\n    min-height: max-content !important;\n    overflow: visible !important;\n    flex: none !important;\n    padding-bottom: max(96px, env(safe-area-inset-bottom)) !important;\n  }\n\n  /* The two desktop columns must become normal-height mobile sections. */\n  .kas-manager-root > .grid {\n    display: block !important;\n    height: auto !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n  }\n\n  .kas-manager-root > .grid > div {\n    display: block !important;\n    width: 100% !important;\n    height: auto !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n    margin-bottom: 12px !important;\n  }\n\n  /* Never constrain the Add/Edit form to viewport height on phones. */\n  .kas-manager-root > .grid > div > div {\n    height: auto !important;\n    max-height: none !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n  }\n\n  /* CRITICAL: history/ledger must expand with all records instead of having\n     an internal 85vh scroll box that gets visually clipped by the page. */\n  .kas-manager-root > .grid > div > div > div.overflow-y-auto {\n    height: auto !important;\n    max-height: none !important;\n    min-height: 0 !important;\n    overflow: visible !important;\n    flex: none !important;\n  }\n\n  /* Keep every transaction row fully visible and easy to tap. */\n  .kas-manager-root .transaction-row,\n  .kas-manager-root [data-kas-transaction-row] {\n    min-height: 74px !important;\n  }\n\n  .kas-manager-root button {\n    touch-action: manipulation !important;\n  }\n\n  .kas-manager-root input,\n  .kas-manager-root select,\n  .kas-manager-root textarea {\n    font-size: 16px !important;\n  }\n\n  /* Mobile-friendly date controls: never force two dates to overflow. */\n  .kas-manager-root input[type="date"] {\n    min-width: 0 !important;\n    width: 100% !important;\n    max-width: 100% !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-mobile-scroll-v3] fixed mobile transaction history clipping and input usability');
