import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_ONE_PAGE_V4__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-one-page-v4] already applied');
  process.exit(0);
}

// Keep the existing 10-row pagination, but make the complete filtered page compact enough
// to show all 10 records without clipping while preserving the seeded dark visual language.
const css = `<style>{\`
${marker}
.tournament-admin-page {
  min-height: 100% !important;
  height: auto !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  padding: 12px 14px !important;
}
.tournament-admin-page > div {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
}
/* Compact hero: enough hierarchy without consuming the table viewport. */
.tournament-admin-page > div > header {
  border-radius: 18px !important;
}
.tournament-admin-page > div > header > div:first-child {
  padding: 12px 16px !important;
}
.tournament-admin-page > div > header > div:first-child > div {
  gap: 10px !important;
}
.tournament-admin-page > div > header h1 {
  margin-top: 5px !important;
  font-size: 22px !important;
  line-height: 1.15 !important;
}
.tournament-admin-page > div > header p {
  margin-top: 3px !important;
  font-size: 11px !important;
  line-height: 1.35 !important;
}
.tournament-admin-page > div > header .inline-flex.min-h-11 {
  min-height: 34px !important;
  padding: 7px 11px !important;
}
/* Stats: dense, aligned and readable. */
.tournament-admin-page > div > header > div:last-child {
  gap: 7px !important;
  padding: 8px !important;
}
.tournament-admin-page > div > header > div:last-child > div {
  min-height: 48px !important;
  padding: 7px 10px !important;
  border-radius: 10px !important;
}
.tournament-admin-page > div > header > div:last-child svg { width: 14px !important; height: 14px !important; }
/* Filters: single compact row on desktop. */
.tournament-admin-page > div > section:nth-child(2) {
  border-radius: 14px !important;
  padding: 9px !important;
}
.tournament-admin-page > div > section:nth-child(2) > div {
  gap: 7px !important;
}
.tournament-admin-page > div > section:nth-child(2) input,
.tournament-admin-page > div > section:nth-child(2) select,
.tournament-admin-page > div > section:nth-child(2) button {
  min-height: 38px !important;
  height: 38px !important;
  font-size: 11px !important;
}
/* Data panel must never clip its records. */
.tournament-admin-page > div > section:last-child {
  overflow: visible !important;
  min-height: 0 !important;
}
.tournament-admin-page > div > section:last-child > div {
  overflow: visible !important;
}
.tournament-admin-page .overflow-x-auto {
  overflow-x: hidden !important;
  overflow-y: visible !important;
  max-height: none !important;
  height: auto !important;
}
/* Table header + 10 compact rows fit as one clean desktop page. */
.tournament-admin-page table thead th {
  height: 36px !important;
  padding: 7px 6px !important;
  font-size: 9px !important;
  line-height: 1.05 !important;
}
.tournament-admin-page table tbody tr {
  height: 48px !important;
  min-height: 48px !important;
}
.tournament-admin-page table tbody td {
  height: 48px !important;
  padding: 5px 6px !important;
  font-size: 10px !important;
  line-height: 1.15 !important;
}
.tournament-admin-page table td:nth-child(2) > div,
.tournament-admin-page table td:nth-child(3) > div,
.tournament-admin-page table td:nth-child(4) > div {
  max-height: 36px !important;
  overflow: hidden !important;
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  text-overflow: ellipsis !important;
}
.tournament-admin-page table td:nth-child(7) {
  max-height: 48px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.tournament-admin-page table td:last-child {
  padding: 4px !important;
}
.tournament-admin-page table td:last-child > div {
  gap: 3px !important;
}
.tournament-admin-page table td:last-child button {
  min-height: 28px !important;
  height: 28px !important;
  padding: 3px 2px !important;
  font-size: 7px !important;
  border-radius: 7px !important;
}
.tournament-admin-page table td:last-child button svg {
  width: 10px !important;
  height: 10px !important;
}
/* Keep pagination/status footer compact and visible. */
.tournament-admin-page > div > section:last-child button,
.tournament-admin-page > div > section:last-child [role="button"] {
  font-size: 10px !important;
}
@media (min-width: 1200px) {
  .tournament-admin-page { padding: 10px 12px !important; }
}
@media (max-width: 1100px) and (min-width: 768px) {
  .tournament-admin-page { padding: 9px 10px !important; }
  .tournament-admin-page > div { gap: 8px !important; }
  .tournament-admin-page > div > header > div:first-child { padding: 10px 13px !important; }
  .tournament-admin-page > div > header h1 { font-size: 19px !important; }
  .tournament-admin-page table tbody tr,
  .tournament-admin-page table tbody td { height: 46px !important; min-height: 46px !important; }
  .tournament-admin-page table tbody td { padding: 4px 4px !important; font-size: 9px !important; }
}
@media (max-width: 767px) {
  .tournament-admin-page { padding: 8px !important; }
  .tournament-admin-page > div { gap: 8px !important; }
  .tournament-admin-page > div > section:nth-child(2) > div { grid-template-columns: 1fr 1fr !important; }
  .tournament-admin-page > div > section:nth-child(2) label { grid-column: 1 / -1 !important; }
  .tournament-admin-page table tbody tr,
  .tournament-admin-page table tbody td { height: auto !important; min-height: 42px !important; }
  .tournament-admin-page table tbody td { padding: 5px 4px !important; font-size: 9px !important; }
}
\`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-one-page-v4] opening tag not found');
src = src.replace(opening, `${opening}${css}`);
fs.writeFileSync(path, src);
console.log('[patch-admin-one-page-v4] compacted registration admin so 10 filtered records fit cleanly without clipping');
