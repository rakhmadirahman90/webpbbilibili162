import fs from 'node:fs';

const cssPath = 'src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* KAS_MODERN_UI_V2 */';

if (!css.includes(marker)) {
  css += `

${marker}
/*
 * PB Bilibili 162 — Kas Admin UI
 * Goals: clear hierarchy, calm density, one page scroll, responsive form/list,
 * accessible touch targets, and financial numbers that are easy to scan.
 */
[data-kas-manager="true"] {
  --kas-surface: rgba(11, 18, 36, .94);
  --kas-surface-2: rgba(15, 23, 42, .82);
  --kas-border: rgba(148, 163, 184, .13);
  --kas-muted: #94a3b8;
  --kas-blue: #60a5fa;
  width: min(100%, 1500px) !important;
  margin-inline: auto !important;
  padding: 20px clamp(16px, 2vw, 32px) 40px !important;
  gap: 18px !important;
  overflow: visible !important;
}

[data-kas-manager="true"] > header {
  min-height: 132px;
  padding: 24px !important;
  border-radius: 24px !important;
  border-color: rgba(96, 165, 250, .16) !important;
  background:
    radial-gradient(circle at 88% 18%, rgba(59,130,246,.14), transparent 28%),
    linear-gradient(135deg, rgba(15,23,42,.98), rgba(9,16,32,.96)) !important;
  box-shadow: 0 18px 50px rgba(0,0,0,.22) !important;
}

[data-kas-manager="true"] > header h1 {
  letter-spacing: -.045em !important;
}

[data-kas-manager="true"] > header input {
  height: 38px;
}

[data-kas-manager="true"] > header button {
  min-height: 38px;
  transition: transform .16s ease, filter .16s ease, border-color .16s ease;
}
[data-kas-manager="true"] > header button:hover { transform: translateY(-1px); filter: brightness(1.06); }
[data-kas-manager="true"] > header button:active { transform: translateY(0); }

/* KPI area: consistent card anatomy and readable numerals. */
[data-kas-manager="true"] > div.grid.grid-cols-2 {
  gap: 12px !important;
}
[data-kas-manager="true"] > div.grid.grid-cols-2 > div {
  min-height: 112px;
  padding: 18px !important;
  border-radius: 18px !important;
  box-shadow: 0 10px 28px rgba(0,0,0,.12);
  transition: transform .16s ease, border-color .16s ease;
}
[data-kas-manager="true"] > div.grid.grid-cols-2 > div:hover {
  transform: translateY(-2px);
  border-color: rgba(148,163,184,.22) !important;
}
[data-kas-manager="true"] > div.grid.grid-cols-2 h2 {
  font-variant-numeric: tabular-nums;
  letter-spacing: -.035em;
}

/* Latest transaction cards. */
[data-kas-manager="true"] section.grid.grid-cols-1 {
  gap: 12px !important;
}
[data-kas-manager="true"] section.grid.grid-cols-1 > div {
  min-height: 126px;
  padding: 17px 18px !important;
  border-radius: 18px !important;
  background: rgba(11,18,36,.88) !important;
}

/* Date/filter toolbar: make it a true control bar instead of a loose row. */
[data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) {
  padding: 15px 18px !important;
  border-radius: 18px !important;
  background: rgba(15,23,42,.82) !important;
  box-shadow: 0 10px 28px rgba(0,0,0,.10);
}
[data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) label {
  min-height: 40px;
  background: rgba(2,6,23,.66) !important;
}
[data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) button {
  min-height: 40px;
}

/* Main work area: form and history have equal visual weight. */
[data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 {
  align-items: start !important;
  gap: 18px !important;
}
[data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:first-child,
[data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:last-child {
  min-width: 0 !important;
}

/* Form card — remove the cramped nested-scroll feeling from the screenshot. */
[data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:first-child > div {
  max-height: none !important;
  overflow: visible !important;
  padding: 20px !important;
  border-radius: 20px !important;
  background: linear-gradient(180deg, rgba(15,23,42,.98), rgba(8,15,30,.96)) !important;
  box-shadow: 0 16px 42px rgba(0,0,0,.16);
}
[data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:first-child h3 {
  font-size: 15px !important;
  letter-spacing: -.02em;
}
[data-kas-manager="true"] form {
  gap: 0 !important;
}
[data-kas-manager="true"] form > label {
  display: block;
  padding-top: 3px;
}
[data-kas-manager="true"] form select,
[data-kas-manager="true"] form input:not([type="radio"]):not([type="checkbox"]) {
  min-height: 42px;
  border-radius: 12px !important;
  background: rgba(2,6,23,.56) !important;
  border-color: rgba(148,163,184,.14) !important;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
[data-kas-manager="true"] form select:focus,
[data-kas-manager="true"] form input:focus {
  border-color: rgba(96,165,250,.65) !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,.12) !important;
  background: rgba(2,6,23,.78) !important;
}
[data-kas-manager="true"] form > button {
  min-height: 46px;
  margin-top: 6px;
  border-radius: 13px !important;
  font-size: 11px !important;
}
[data-kas-manager="true"] form .rounded-lg.border.border-blue-900\/30 {
  border-radius: 10px !important;
}

/* Income/expense switch gets stronger affordance. */
[data-kas-manager="true"] form > div.flex.rounded-xl {
  padding: 4px !important;
  margin-bottom: 2px;
  background: rgba(2,6,23,.72) !important;
}
[data-kas-manager="true"] form > div.flex.rounded-xl button {
  min-height: 38px;
  border-radius: 9px !important;
}

/* History table. */
[data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:last-child > div {
  border-radius: 20px !important;
  background: rgba(11,18,36,.94) !important;
  box-shadow: 0 16px 42px rgba(0,0,0,.14);
}
[data-kas-manager="true"] table {
  font-variant-numeric: tabular-nums;
}
[data-kas-manager="true"] thead th {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  font-size: 9px !important;
  letter-spacing: .08em !important;
  white-space: nowrap;
}
[data-kas-manager="true"] tbody td {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  vertical-align: middle;
}
[data-kas-manager="true"] tbody tr {
  transition: background .14s ease;
}
[data-kas-manager="true"] tbody tr:hover {
  background: rgba(59,130,246,.045) !important;
}
[data-kas-manager="true"] tbody td button {
  min-width: 34px;
  min-height: 34px;
}

/* Bottom financial summary becomes a compact executive strip. */
[data-kas-manager="true"] > section:last-child {
  padding: 18px 20px !important;
  border-radius: 20px !important;
  background: linear-gradient(135deg, rgba(15,23,42,.96), rgba(8,15,30,.96)) !important;
}
[data-kas-manager="true"] > section:last-child > div {
  gap: 18px !important;
}
[data-kas-manager="true"] > section:last-child b {
  font-variant-numeric: tabular-nums;
}

/* Page scrollbar is the only primary scroll. */
[data-kas-manager="true"] .overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(96,165,250,.32) transparent;
}
[data-kas-manager="true"] .overflow-y-auto::-webkit-scrollbar { width: 6px; }
[data-kas-manager="true"] .overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(96,165,250,.28);
  border-radius: 999px;
}

@media (min-width: 1024px) {
  [data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:first-child {
    position: sticky;
    top: 16px;
    align-self: start;
  }
}

@media (max-width: 1023px) {
  [data-kas-manager="true"] {
    padding: 14px 14px 90px !important;
    gap: 14px !important;
  }
  [data-kas-manager="true"] > header {
    padding: 18px !important;
    border-radius: 18px !important;
  }
  [data-kas-manager="true"] > header > div.relative {
    gap: 14px !important;
  }
  [data-kas-manager="true"] > header input {
    min-height: 40px;
  }
  [data-kas-manager="true"] > header .relative.z-10.flex.flex-wrap {
    width: 100%;
  }
  [data-kas-manager="true"] > header .relative.z-10.flex.flex-wrap > * {
    flex: 1 1 auto;
  }
  [data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:first-child > div {
    padding: 16px !important;
    border-radius: 18px !important;
  }
}

@media (max-width: 767px) {
  [data-kas-manager="true"] {
    padding: 10px 10px 100px !important;
    gap: 12px !important;
  }
  [data-kas-manager="true"] > header {
    min-height: 0;
    padding: 15px !important;
  }
  [data-kas-manager="true"] > header h1 { font-size: 22px !important; }
  [data-kas-manager="true"] > header p { font-size: 9px !important; }

  [data-kas-manager="true"] > div.grid.grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0,1fr)) !important;
    gap: 8px !important;
  }
  [data-kas-manager="true"] > div.grid.grid-cols-2 > div {
    min-height: 92px;
    padding: 12px !important;
    border-radius: 15px !important;
  }
  [data-kas-manager="true"] > div.grid.grid-cols-2 > div p {
    font-size: 7px !important;
  }
  [data-kas-manager="true"] > div.grid.grid-cols-2 > div h2 {
    font-size: 13px !important;
  }
  [data-kas-manager="true"] > div.grid.grid-cols-2 > div:last-child > div {
    font-size: 7px !important;
  }

  [data-kas-manager="true"] section.grid.grid-cols-1 > div {
    min-height: 0;
    padding: 13px !important;
    border-radius: 15px !important;
  }

  [data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) {
    padding: 12px !important;
  }
  [data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) > div {
    align-items: stretch !important;
  }
  [data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) > div > div:last-child {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0,1fr));
  }
  [data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) label,
  [data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) button {
    width: 100%;
    min-width: 0;
  }

  [data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 {
    gap: 12px !important;
  }
  [data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:first-child > div {
    padding: 14px !important;
  }
  [data-kas-manager="true"] form select,
  [data-kas-manager="true"] form input:not([type="radio"]):not([type="checkbox"]) {
    min-height: 44px;
  }
  [data-kas-manager="true"] form > button {
    min-height: 48px;
  }
  [data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:last-child > div {
    border-radius: 16px !important;
  }
  [data-kas-manager="true"] > .grid.min-h-0.grid-cols-1 > div:last-child > div > div:first-child {
    padding: 14px !important;
  }
  [data-kas-manager="true"] .overflow-x-auto {
    border-radius: 0 0 16px 16px;
    -webkit-overflow-scrolling: touch;
  }
  [data-kas-manager="true"] table { min-width: 760px !important; }

  [data-kas-manager="true"] > section:last-child {
    padding: 14px !important;
  }
  [data-kas-manager="true"] > section:last-child > div {
    gap: 12px !important;
  }
}

@media (max-width: 380px) {
  [data-kas-manager="true"] > div.grid.grid-cols-2 > div { padding: 10px !important; }
  [data-kas-manager="true"] > div.grid.grid-cols-2 > div h2 { font-size: 12px !important; }
  [data-kas-manager="true"] section.rounded-2xl:has(input[type="date"]) > div > div:last-child { gap: 6px !important; }
}
`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('[patch-kas-modern-ui] applied modern finance/admin UI system');
