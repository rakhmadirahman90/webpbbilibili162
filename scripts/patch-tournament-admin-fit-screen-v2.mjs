import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_FIT_SCREEN_V2__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-fit-screen-v2] already applied');
  process.exit(0);
}

const css = `<style>{\`
${marker}
/* Precision desktop table: one viewport width, vertical page scroll only. */
.tournament-admin-page,
.tournament-admin-page * { box-sizing: border-box !important; }
.tournament-admin-page { width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
.tournament-admin-page > div { width: 100% !important; max-width: none !important; margin-left: 0 !important; margin-right: 0 !important; }
.tournament-admin-page > div > section:last-child { background: transparent !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; }
.tournament-admin-page > div > section:last-child > div { width: 100% !important; max-width: 100% !important; overflow: visible !important; }
.tournament-admin-page .overflow-x-auto { width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; overflow-y: visible !important; }
.tournament-admin-page table { width: 100% !important; max-width: 100% !important; min-width: 0 !important; table-layout: fixed !important; border-collapse: collapse !important; border-spacing: 0 !important; }
.tournament-admin-page table thead th { padding: 10px 7px !important; height: 42px !important; white-space: normal !important; overflow-wrap: anywhere !important; font-size: 9px !important; line-height: 1.15 !important; vertical-align: middle !important; }
.tournament-admin-page table tbody tr { height: auto !important; background: #fff !important; }
.tournament-admin-page table tbody td { padding: 11px 7px !important; height: auto !important; min-height: 0 !important; overflow: visible !important; vertical-align: middle !important; font-size: 11px !important; line-height: 1.3 !important; }
.tournament-admin-page table th:nth-child(1), .tournament-admin-page table td:nth-child(1) { width: 4% !important; }
.tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 22% !important; }
.tournament-admin-page table th:nth-child(3), .tournament-admin-page table td:nth-child(3) { width: 11% !important; }
.tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 15% !important; }
.tournament-admin-page table th:nth-child(5), .tournament-admin-page table td:nth-child(5) { width: 9% !important; }
.tournament-admin-page table th:nth-child(6), .tournament-admin-page table td:nth-child(6) { width: 9% !important; }
.tournament-admin-page table th:nth-child(7), .tournament-admin-page table td:nth-child(7) { width: 11% !important; }
.tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 19% !important; }
.tournament-admin-page table td:nth-child(2) > div,
.tournament-admin-page table td:nth-child(3) > div,
.tournament-admin-page table td:nth-child(4) > div { max-width: 100% !important; min-width: 0 !important; overflow-wrap: anywhere !important; word-break: break-word !important; white-space: normal !important; }
.tournament-admin-page table td:nth-child(5) span,
.tournament-admin-page table td:nth-child(6) span { max-width: 100% !important; white-space: normal !important; text-align: center !important; }
.tournament-admin-page table td:nth-child(7) { white-space: normal !important; overflow-wrap: anywhere !important; word-break: break-word !important; }
.tournament-admin-page table th:last-child { text-align: center !important; }
.tournament-admin-page table td:last-child { padding-left: 6px !important; padding-right: 6px !important; }
.tournament-admin-page table td:last-child > div { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 5px !important; width: 100% !important; max-width: 100% !important; align-items: stretch !important; }
.tournament-admin-page table td:last-child button { width: 100% !important; min-width: 0 !important; min-height: 32px !important; height: auto !important; padding: 5px 3px !important; gap: 3px !important; white-space: normal !important; overflow-wrap: anywhere !important; line-height: 1.05 !important; font-size: 8px !important; border-radius: 8px !important; }
.tournament-admin-page table td:last-child button svg { width: 12px !important; height: 12px !important; flex: 0 0 auto !important; }
.tournament-admin-page table tbody td:first-child { border-radius: 0 !important; }
.tournament-admin-page table tbody td:last-child { border-radius: 0 !important; }
@media (max-width: 1100px) and (min-width: 768px) {
  .tournament-admin-page { padding-left: 12px !important; padding-right: 12px !important; }
  .tournament-admin-page table tbody td { padding-left: 5px !important; padding-right: 5px !important; font-size: 10px !important; }
  .tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 21% !important; }
  .tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 14% !important; }
  .tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 20% !important; }
}
@media (max-width: 767px) {
  .tournament-admin-page { overflow-x: hidden !important; }
  .tournament-admin-page > div { width: 100% !important; }
}
\`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-fit-screen-v2] opening tag not found');
src = src.replace(opening, `${opening}${css}`);
fs.writeFileSync(path, src);
console.log('[patch-admin-fit-screen-v2] applied precision viewport-fit table and vertical-only scrolling');
