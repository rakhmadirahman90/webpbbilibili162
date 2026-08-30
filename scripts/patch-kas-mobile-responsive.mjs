import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';

let src = fs.readFileSync(componentPath, 'utf8');

const replacements = [
  [
    'w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto select-none pb-28 md:pb-8',
    'kas-manager-root w-full min-h-full flex flex-col p-2.5 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto overflow-x-hidden select-none pb-24 md:pb-8'
  ],
  [
    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl',
    'kas-manager-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl'
  ],
  [
    'relative z-10 flex flex-wrap items-center gap-2 shrink-0',
    'kas-manager-actions relative z-10 flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto'
  ],
  [
    'flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl focus-within:border-blue-500/50 transition-all w-full sm:w-52',
    'flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-2 rounded-xl focus-within:border-blue-500/50 transition-all w-full sm:w-52 min-w-0'
  ],
  [
    'flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600',
    'kas-action-btn flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600'
  ],
  [
    'flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600',
    'kas-action-btn flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-amber-600'
  ],
  [
    'grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 shrink-0',
    'kas-stat-grid grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 shrink-0 min-w-0'
  ],
  [
    'bg-slate-800/60 border border-white/10 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]',
    'kas-stat-card bg-slate-800/60 border border-white/10 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem] min-w-0'
  ],
  [
    'bg-emerald-500/10 border border-emerald-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]',
    'kas-stat-card bg-emerald-500/10 border border-emerald-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem] min-w-0'
  ],
  [
    'bg-red-500/10 border border-red-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]',
    'kas-stat-card bg-red-500/10 border border-red-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem] min-w-0'
  ],
  [
    'bg-blue-500/10 border border-blue-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]',
    'kas-stat-card bg-blue-500/10 border border-blue-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem] min-w-0'
  ],
  [
    'bg-slate-900/90 border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg',
    'kas-date-filter bg-slate-900/90 border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg min-w-0'
  ],
  [
    '<div className="flex items-center gap-2">\n          <Calendar size={16} className="text-blue-400 shrink-0" />',
    '<div className="kas-date-title flex items-center gap-2 min-w-0">\n          <Calendar size={16} className="text-blue-400 shrink-0" />'
  ],
  [
    'flex flex-wrap items-center gap-2 w-full sm:w-auto',
    'kas-date-controls flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0'
  ],
  [
    'flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl flex-1 sm:flex-initial',
    'kas-date-input flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-2 rounded-xl flex-1 sm:flex-initial min-w-0'
  ],
  [
    'bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer',
    'bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer min-w-0 w-full'
  ],
  [
    'px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto',
    'px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto'
  ],
  [
    'bg-[#0b1224]/90 border border-white/10 p-3 sm:p-5 rounded-2xl md:rounded-[2.5rem] flex flex-col h-auto max-h-[85vh] md:h-full',
    'bg-[#0b1224]/90 border border-white/10 p-3 sm:p-5 rounded-2xl md:rounded-[2.5rem] flex flex-col h-auto max-h-none md:max-h-[85vh] md:h-full'
  ],
  [
    'bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col h-auto max-h-[85vh] md:h-full',
    'bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col h-auto max-h-none md:max-h-[85vh] md:h-full'
  ]
];

for (const [from, to] of replacements) {
  src = src.replace(from, to);
}

fs.writeFileSync(componentPath, src, 'utf8');

const marker = '/* KAS_MANAGER_MOBILE_RESPONSIVE_V1 */';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width: 767px) {\n  .kas-manager-root {\n    width: 100%;\n    max-width: 100%;\n    overflow-x: hidden;\n  }\n\n  .kas-manager-root *,\n  .kas-manager-root input,\n  .kas-manager-root select,\n  .kas-manager-root textarea,\n  .kas-manager-root button {\n    min-width: 0;\n  }\n\n  .kas-manager-header {\n    width: 100%;\n  }\n\n  .kas-manager-actions {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);\n  }\n\n  .kas-manager-actions > :first-child {\n    grid-column: 1 / -1;\n  }\n\n  .kas-action-btn {\n    width: 100%;\n    justify-content: center;\n    min-height: 40px;\n  }\n\n  .kas-stat-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    align-items: stretch;\n  }\n\n  .kas-stat-card {\n    min-width: 0;\n    overflow: hidden;\n  }\n\n  .kas-stat-card h2,\n  .kas-stat-card p,\n  .kas-stat-card div {\n    min-width: 0;\n    overflow-wrap: anywhere;\n  }\n\n  .kas-stat-card:nth-child(4) {\n    grid-column: 1 / -1;\n  }\n\n  .kas-date-filter {\n    align-items: stretch;\n  }\n\n  .kas-date-title {\n    width: 100%;\n  }\n\n  .kas-date-controls {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);\n    width: 100%;\n  }\n\n  .kas-date-input {\n    width: 100%;\n    min-width: 0;\n  }\n\n  .kas-date-input span {\n    flex: 0 0 auto;\n    white-space: nowrap;\n  }\n\n  .kas-date-input input {\n    width: 100%;\n    min-width: 0;\n    max-width: 100%;\n    font-size: 11px;\n  }\n\n  .kas-date-controls > button {\n    grid-column: 1 / -1;\n    width: 100%;\n  }\n}\n\n@media (max-width: 390px) {\n  .kas-manager-root {\n    padding-left: 8px;\n    padding-right: 8px;\n  }\n\n  .kas-stat-grid {\n    gap: 8px;\n  }\n\n  .kas-stat-card {\n    padding: 10px;\n  }\n\n  .kas-stat-card h2 {\n    font-size: 16px;\n  }\n\n  .kas-stat-card:nth-child(4) h2 {\n    font-size: 19px;\n  }\n\n  .kas-date-controls {\n    gap: 8px;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-mobile-responsive] applied responsive mobile layout for KasManager');
