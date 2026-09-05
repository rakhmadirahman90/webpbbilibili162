import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_ONE_PAGE_V5__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-one-page-v5] already applied');
  process.exit(0);
}

const css = `<style>{\`
${marker}
/* The admin shell itself is a viewport; this page must consume that viewport rather than
   creating a second scroll container that cuts the participant table. */
.admin-main:has(.tournament-admin-page) { overflow-y: hidden !important; overflow-x: hidden !important; }
.tournament-admin-page {
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow: hidden !important;
  padding: 8px 10px !important;
  box-sizing: border-box !important;
}
.tournament-admin-page > div {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}
/* Hero + statistics */
.tournament-admin-page > div > header {
  flex: 0 0 auto !important;
  border-radius: 14px !important;
}
.tournament-admin-page > div > header > div:first-child {
  padding: 8px 12px !important;
}
.tournament-admin-page > div > header > div:first-child > div { gap: 7px !important; }
.tournament-admin-page > div > header h1 {
  margin-top: 3px !important;
  font-size: 18px !important;
  line-height: 1.05 !important;
}
.tournament-admin-page > div > header p {
  margin-top: 2px !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
}
.tournament-admin-page > div > header .inline-flex.min-h-11 {
  min-height: 30px !important;
  height: 30px !important;
  padding: 5px 9px !important;
  font-size: 9px !important;
}
.tournament-admin-page > div > header > div:last-child {
  gap: 5px !important;
  padding: 5px 7px !important;
}
.tournament-admin-page > div > header > div:last-child > div {
  min-height: 38px !important;
  height: 38px !important;
  padding: 5px 8px !important;
  border-radius: 8px !important;
}
.tournament-admin-page > div > header > div:last-child svg { width: 12px !important; height: 12px !important; }
/* Export card: compact and horizontal. */
.tournament-admin-page > div > section:nth-child(2) {
  flex: 0 0 auto !important;
  min-height: 42px !important;
  height: 42px !important;
  padding: 6px 9px !important;
  border-radius: 10px !important;
}
.tournament-admin-page > div > section:nth-child(2) > div { gap: 6px !important; }
.tournament-admin-page > div > section:nth-child(2) button {
  min-height: 28px !important;
  height: 28px !important;
  padding: 4px 10px !important;
  font-size: 9px !important;
}
/* Search/filter row */
.tournament-admin-page > div > section:nth-child(3) {
  flex: 0 0 auto !important;
  padding: 6px 8px !important;
  border-radius: 10px !important;
}
.tournament-admin-page > div > section:nth-child(3) > div { gap: 5px !important; }
.tournament-admin-page > div > section:nth-child(3) input,
.tournament-admin-page > div > section:nth-child(3) select,
.tournament-admin-page > div > section:nth-child(3) button {
  min-height: 32px !important;
  height: 32px !important;
  font-size: 10px !important;
}
/* Participant panel is the only flexible region. */
.tournament-admin-page > div > section:last-child {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  overflow: hidden !important;
  border-radius: 12px !important;
  display: flex !important;
  flex-direction: column !important;
}
.tournament-admin-page > div > section:last-child > div:first-child {
  flex: 0 0 auto !important;
  min-height: 42px !important;
  height: 42px !important;
  padding: 6px 10px !important;
}
.tournament-admin-page > div > section:last-child > div:first-child h2 { font-size: 11px !important; }
.tournament-admin-page > div > section:last-child > div:first-child p { margin-top: 1px !important; font-size: 9px !important; }
.tournament-admin-page > div > section:last-child > div:first-child span { padding: 4px 7px !important; font-size: 8px !important; }
/* The table receives all remaining height and never creates a horizontal/vertical scroller. */
.tournament-admin-page > div > section:last-child > .overflow-x-auto {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  max-height: none !important;
  height: auto !important;
}
.tournament-admin-page table {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
}
.tournament-admin-page table thead th {
  height: 26px !important;
  padding: 4px 5px !important;
  font-size: 8px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}
.tournament-admin-page table tbody tr { height: 35px !important; min-height: 35px !important; }
.tournament-admin-page table tbody td {
  height: 35px !important;
  padding: 3px 5px !important;
  font-size: 9px !important;
  line-height: 1.05 !important;
  vertical-align: middle !important;
}
/* Stable proportional columns; action column is wide enough for 4 compact controls. */
.tournament-admin-page table th:nth-child(1), .tournament-admin-page table td:nth-child(1) { width: 4% !important; }
.tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 22% !important; }
.tournament-admin-page table th:nth-child(3), .tournament-admin-page table td:nth-child(3) { width: 12% !important; }
.tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 14% !important; }
.tournament-admin-page table th:nth-child(5), .tournament-admin-page table td:nth-child(5) { width: 9% !important; }
.tournament-admin-page table th:nth-child(6), .tournament-admin-page table td:nth-child(6) { width: 9% !important; }
.tournament-admin-page table th:nth-child(7), .tournament-admin-page table td:nth-child(7) { width: 11% !important; }
.tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 19% !important; }
.tournament-admin-page table td:nth-child(2) > div,
.tournament-admin-page table td:nth-child(3) > div,
.tournament-admin-page table td:nth-child(4) > div {
  max-height: 28px !important;
  overflow: hidden !important;
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  text-overflow: ellipsis !important;
  overflow-wrap: anywhere !important;
}
.tournament-admin-page table td:nth-child(7) { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.tournament-admin-page table td:last-child { padding: 2px 4px !important; }
.tournament-admin-page table td:last-child > div {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 3px !important;
  width: 100% !important;
}
.tournament-admin-page table td:last-child button {
  min-width: 0 !important;
  min-height: 25px !important;
  height: 25px !important;
  padding: 2px 3px !important;
  font-size: 7px !important;
  line-height: 1 !important;
  border-radius: 6px !important;
  white-space: nowrap !important;
}
.tournament-admin-page table td:last-child button svg { width: 9px !important; height: 9px !important; }
/* Footer + pagination stay inside the same one-page card. */
.tournament-admin-page > div > section:last-child > div:last-child {
  flex: 0 0 auto !important;
  min-height: 34px !important;
  height: 34px !important;
  padding: 4px 8px !important;
}
.tournament-admin-page > div > section:last-child > div:last-child p { font-size: 8px !important; }
.tournament-admin-page > div > section:last-child > div:last-child button {
  min-height: 25px !important;
  height: 25px !important;
  padding: 2px 7px !important;
  font-size: 8px !important;
}
/* Add-participant action */
.tournament-admin-page .participant-add-btn {
  min-height: 30px !important;
  height: 30px !important;
  padding: 5px 10px !important;
  border-radius: 8px !important;
  font-size: 9px !important;
  font-weight: 900 !important;
}
@media (max-width: 1100px) and (min-width: 768px) {
  .tournament-admin-page { padding: 6px 8px !important; }
  .tournament-admin-page > div { gap: 5px !important; }
  .tournament-admin-page table tbody tr, .tournament-admin-page table tbody td { height: 32px !important; min-height: 32px !important; }
  .tournament-admin-page table tbody td { padding: 2px 4px !important; font-size: 8px !important; }
  .tournament-admin-page table td:last-child button { height: 23px !important; min-height: 23px !important; font-size: 6.5px !important; }
}
@media (max-width: 767px) {
  .admin-main:has(.tournament-admin-page) { overflow-y: auto !important; }
  .tournament-admin-page { height: auto !important; max-height: none !important; overflow: visible !important; }
  .tournament-admin-page > div { height: auto !important; }
  .tournament-admin-page > div > section:last-child { overflow: visible !important; }
  .tournament-admin-page > div > section:last-child > .overflow-x-auto { overflow: visible !important; }
  .tournament-admin-page table { min-width: 900px !important; }
  .tournament-admin-page table td:last-child > div { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}
\`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-one-page-v5] opening tag not found');
src = src.replace(opening, `${opening}${css}`);

// The V2 route has no create handler. Provide a clearly visible, safe entry point to the
// canonical participant registration form instead of inventing an INSERT payload here.
if (!src.includes('participant-add-btn')) {
  const target = '<span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 sm:inline-flex">Realtime</span>';
  if (!src.includes(target)) throw new Error('[patch-admin-one-page-v5] participant header target not found');
  const button = '<button type="button" className="participant-add-btn inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[10px] font-black uppercase text-white shadow-sm transition hover:bg-blue-500" onClick={() => { window.location.href = \'/pendaftaran-turnamen\'; }}><span aria-hidden="true">+</span> Tambah Peserta</button>';
  src = src.replace(target, `${button}<span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 sm:inline-flex">Realtime</span>`);
}

fs.writeFileSync(path, src);
console.log('[patch-admin-one-page-v5] fixed viewport clipping, compacted 10-row table, and added participant action');