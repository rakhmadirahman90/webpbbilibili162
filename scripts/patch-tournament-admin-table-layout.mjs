import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_TABLE_LAYOUT_V1__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-table-layout] already applied');
  process.exit(0);
}

const css = `<style>{\`
${marker}
.tournament-admin-page table {
  width: 100%;
  min-width: 1460px !important;
  table-layout: fixed !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
}
.tournament-admin-page table th,
.tournament-admin-page table td {
  box-sizing: border-box;
  vertical-align: middle !important;
}
.tournament-admin-page table thead th {
  height: 48px;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  white-space: nowrap;
  background: #f8fafc;
}
.tournament-admin-page table tbody tr {
  min-height: 86px;
  transition: background-color .15s ease;
}
.tournament-admin-page table tbody tr:hover { background: #f8fbff; }
.tournament-admin-page table tbody td {
  padding-top: 14px !important;
  padding-bottom: 14px !important;
  line-height: 1.35 !important;
  overflow: hidden;
}
.tournament-admin-page table th:nth-child(1), .tournament-admin-page table td:nth-child(1) { width: 56px; }
.tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 260px; }
.tournament-admin-page table th:nth-child(3), .tournament-admin-page table td:nth-child(3) { width: 190px; }
.tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 230px; }
.tournament-admin-page table th:nth-child(5), .tournament-admin-page table td:nth-child(5) { width: 135px; }
.tournament-admin-page table th:nth-child(6), .tournament-admin-page table td:nth-child(6) { width: 135px; }
.tournament-admin-page table th:nth-child(7), .tournament-admin-page table td:nth-child(7) { width: 170px; }
.tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 284px; }
.tournament-admin-page table td > div,
.tournament-admin-page table td > span,
.tournament-admin-page table td > p { min-width: 0; }
.tournament-admin-page table td:nth-child(2) > div,
.tournament-admin-page table td:nth-child(3) > div,
.tournament-admin-page table td:nth-child(4) > div {
  overflow-wrap: anywhere;
  word-break: break-word;
}
.tournament-admin-page table td:nth-child(7) { white-space: nowrap; }
.tournament-admin-page table th:last-child { text-align: right; }
.tournament-admin-page table td:last-child { overflow: visible !important; }
.tournament-admin-page table td:last-child > div {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 7px !important;
  width: 100%;
}
.tournament-admin-page table td:last-child button {
  flex: 0 0 auto !important;
  min-height: 36px !important;
  white-space: nowrap !important;
  border-radius: 10px !important;
  line-height: 1 !important;
}
.tournament-admin-page .overflow-x-auto {
  overflow-x: auto !important;
  overflow-y: visible !important;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  -webkit-overflow-scrolling: touch;
}
@media (max-width: 767px) {
  .tournament-admin-page table { min-width: 0 !important; }
  .tournament-admin-page .divide-y.divide-slate-100.md\\:hidden button { min-height: 40px; }
}
\`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-table-layout] tournament admin opening tag not found');
src = src.replace(opening, `${opening}${css}`);
fs.writeFileSync(path, src);
console.log('[patch-admin-table-layout] professional table widths, spacing, wrapping, and action layout applied');
