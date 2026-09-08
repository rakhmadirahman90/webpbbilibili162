import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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
kas = kas.replace('<form onSubmit={saveKas} className="space-y-3">', '<form onSubmit={saveKas} className="kas-entry-form space-y-3">');
kas = kas.replace('max-h-[85vh] min-h-0 flex-col overflow-y-auto rounded-2xl', 'max-h-none min-h-0 flex-col overflow-visible rounded-2xl');
const switchRe = /<div className="(?:kas-transaction-switch )?flex rounded-xl border border-white\/10 bg-black p-1">[\s\S]*?<\/div>\s*<label className="block text-\[9px\] font-black uppercase tracking-widest text-slate-400">Kategori/;
if (switchRe.test(kas)) {
  kas = kas.replace(switchRe, m => m.replace(/<div className="[^\"]*flex rounded-xl border border-white\/10 bg-black p-1">/, '<div className="kas-transaction-switch flex w-full min-w-0 rounded-xl border border-white/10 bg-black p-1">'));
}
fs.writeFileSync(kasPath, kas, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_LAYOUT_FINAL_V4 */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.admin-main-scroll { min-height: 0 !important; height: 100% !important; overflow-y: auto !important; overflow-x: hidden !important; overscroll-behavior: contain; scrollbar-gutter: stable; }\n.admin-main-scroll > [data-kas-manager="true"], .admin-main-scroll > .kas-manager-root { width: 100% !important; max-width: 100% !important; min-height: max-content !important; height: auto !important; flex: none !important; overflow: visible !important; box-sizing: border-box; }\n.kas-manager-root { width: 100% !important; min-width: 0 !important; min-height: max-content !important; height: auto !important; overflow: visible !important; box-sizing: border-box !important; }\n.kas-entry-form { width: 100% !important; min-width: 0 !important; max-width: 100% !important; display: flex !important; flex-direction: column !important; gap: .75rem !important; }\n.kas-entry-form > div:first-child { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; align-self: stretch !important; box-sizing: border-box !important; }\n.kas-entry-form > div:first-child > button { display: block !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; min-height: 44px !important; padding-left: .5rem !important; padding-right: .5rem !important; overflow: hidden !important; white-space: nowrap !important; text-overflow: clip !important; }\n.kas-entry-form > label, .kas-entry-form > div { width: 100% !important; min-width: 0 !important; max-width: 100% !important; box-sizing: border-box !important; }\n.kas-entry-form input, .kas-entry-form select, .kas-entry-form textarea { width: 100% !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }\n@media (max-width: 767px) { .admin-main-scroll { height: auto !important; min-height: 0 !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important; } .admin-main-scroll > [data-kas-manager="true"], .admin-main-scroll > .kas-manager-root { padding-bottom: max(120px,env(safe-area-inset-bottom)) !important; } .admin-main-scroll [class*="max-h-"] { max-height: none !important; } }\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

execFileSync(process.execPath, ['scripts/patch-navbar-tournament-submenus.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/patch-admin-participant-document-preview.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/patch-seeded-export-layout.mjs'], { stdio: 'inherit' });

console.log('[patch-kas-layout-final] full-width Pemasukan/Pengeluaran tabs and page scroll applied');
