import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_FIT_SCREEN_V1__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-fit-screen] already applied');
  process.exit(0);
}

const css = `<style>{\`
${marker}
/* Full-screen professional table: no horizontal scrolling, clean vertical flow. */
.tournament-admin-page {
  overflow-x: hidden !important;
}
.tournament-admin-page > div {
  width: 100% !important;
  max-width: none !important;
}
.tournament-admin-page > div > section:last-child {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}
.tournament-admin-page > div > section:last-child > div {
  overflow-x: hidden !important;
}
.tournament-admin-page table {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  border-collapse: separate !important;
  border-spacing: 0 8px !important;
}
.tournament-admin-page table thead th {
  height: 44px !important;
  padding: 10px 8px !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  white-space: normal !important;
  background: transparent !important;
  border-bottom: 1px solid #cbd5e1 !important;
}
.tournament-admin-page table tbody tr {
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(15,23,42,.06) !important;
}
.tournament-admin-page table tbody tr:hover {
  background: #ffffff !important;
  box-shadow: 0 3px 10px rgba(15,23,42,.09) !important;
}
.tournament-admin-page table tbody td {
  padding: 12px 8px !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
  overflow: hidden !important;
  vertical-align: middle !important;
}
.tournament-admin-page table tbody td:first-child {
  border-radius: 12px 0 0 12px;
}
.tournament-admin-page table tbody td:last-child {
  border-radius: 0 12px 12px 0;
  overflow: visible !important;
}
/* 100% width allocation: the complete dataset always fits the page. */
.tournament-admin-page table th:nth-child(1), .tournament-admin-page table td:nth-child(1) { width: 4% !important; }
.tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 19% !important; }
.tournament-admin-page table th:nth-child(3), .tournament-admin-page table td:nth-child(3) { width: 12% !important; }
.tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 17% !important; }
.tournament-admin-page table th:nth-child(5), .tournament-admin-page table td:nth-child(5) { width: 9% !important; }
.tournament-admin-page table th:nth-child(6), .tournament-admin-page table td:nth-child(6) { width: 9% !important; }
.tournament-admin-page table th:nth-child(7), .tournament-admin-page table td:nth-child(7) { width: 10% !important; }
.tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 20% !important; }
.tournament-admin-page table td > div,
.tournament-admin-page table td > span,
.tournament-admin-page table td > p {
  min-width: 0 !important;
  max-width: 100% !important;
}
.tournament-admin-page table td:nth-child(2) > div,
.tournament-admin-page table td:nth-child(3) > div,
.tournament-admin-page table td:nth-child(4) > div {
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  white-space: normal !important;
}
.tournament-admin-page table td:nth-child(7) {
  white-space: normal !important;
}
.tournament-admin-page table th:last-child {
  text-align: center !important;
}
.tournament-admin-page table td:last-child > div {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 6px !important;
  width: 100% !important;
  align-items: stretch !important;
}
.tournament-admin-page table td:last-child button {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 34px !important;
  padding: 7px 6px !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  border-radius: 9px !important;
  line-height: 1.15 !important;
  font-size: 10px !important;
}
.tournament-admin-page .overflow-x-auto {
  overflow-x: hidden !important;
  overflow-y: visible !important;
  scrollbar-width: none !important;
}
.tournament-admin-page .overflow-x-auto::-webkit-scrollbar {
  display: none !important;
}
@media (max-width: 1023px) and (min-width: 768px) {
  .tournament-admin-page table tbody td { padding-left: 6px !important; padding-right: 6px !important; font-size: 11px !important; }
  .tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 18% !important; }
  .tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 16% !important; }
  .tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 22% !important; }
}
@media (max-width: 767px) {
  .tournament-admin-page > div { max-width: none !important; }
  .tournament-admin-page > div > section:last-child { display: none !important; }
}
\`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-fit-screen] tournament admin opening tag not found');
src = src.replace(opening, `${opening}${css}`);
fs.writeFileSync(path, src);
console.log('[patch-admin-fit-screen] removed outer table card, disabled horizontal scroll, and fit table to viewport');
