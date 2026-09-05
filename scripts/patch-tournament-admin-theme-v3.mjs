import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_THEME_V3__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-theme-v3] already applied');
  process.exit(0);
}

const css = `<style>{\`
${marker}
/* Match the seeded admin visual language while keeping the registration table viewport-perfect. */
.tournament-admin-page,
.tournament-admin-page * { box-sizing: border-box !important; }
.tournament-admin-page {
  min-height: 100% !important;
  background: #020817 !important;
  color: #e5edf9 !important;
  overflow-x: hidden !important;
}
.tournament-admin-page > div {
  width: 100% !important;
  max-width: none !important;
}
/* Remove the large white outer card seen around the registration data. */
.tournament-admin-page > div > section:last-child,
.tournament-admin-page > div > section:last-child > div {
  background: transparent !important;
  border-color: rgba(148,163,184,.16) !important;
  box-shadow: none !important;
}
/* Hero and dashboard cards use the same deep navy language as Seeded. */
.tournament-admin-page section,
.tournament-admin-page [class*="bg-white"],
.tournament-admin-page [class*="bg-slate-50"] {
  color: #e5edf9;
}
.tournament-admin-page > div > section:first-of-type {
  background: linear-gradient(135deg,#07152c 0%,#0b1d38 55%,#0a1730 100%) !important;
  border: 1px solid rgba(59,130,246,.28) !important;
  box-shadow: 0 18px 45px rgba(0,0,0,.18) !important;
}
.tournament-admin-page > div > section:first-of-type h1,
.tournament-admin-page > div > section:first-of-type p,
.tournament-admin-page > div > section:first-of-type span { color: #f8fafc !important; }
/* Stats / export / filters become compact dark professional cards. */
.tournament-admin-page > div > div,
.tournament-admin-page > div > section:not(:first-of-type) {
  border-color: rgba(148,163,184,.18) !important;
}
/* Dashboard statistic numbers must remain highly visible on the dark theme. */
.tournament-admin-page > div > header > div.grid > div > :last-child,
.tournament-admin-page > div > header > div.grid > div [class*="text-2xl"],
.tournament-admin-page > div > header > div.grid > div [class*="text-3xl"] {
  color: #ffffff !important;
  opacity: 1 !important;
  text-shadow: 0 1px 2px rgba(0,0,0,.25) !important;
}
.tournament-admin-page input,
.tournament-admin-page select,
.tournament-admin-page button {
  font-family: inherit !important;
}
.tournament-admin-page input,
.tournament-admin-page select {
  background: #0b172b !important;
  color: #f8fafc !important;
  border-color: #29405f !important;
}
.tournament-admin-page input::placeholder { color: #8da2bd !important; }
/* Data section: no horizontal scroll, one viewport width, vertical page flow. */
.tournament-admin-page .overflow-x-auto {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
}
.tournament-admin-page table {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  background: transparent !important;
}
.tournament-admin-page table thead th {
  height: 44px !important;
  padding: 10px 8px !important;
  background: #0a1629 !important;
  color: #8ea4c1 !important;
  border-bottom: 1px solid #263b59 !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  vertical-align: middle !important;
}
.tournament-admin-page table tbody tr {
  height: auto !important;
  background: #071326 !important;
  border-bottom: 1px solid rgba(71,95,124,.30) !important;
}
.tournament-admin-page table tbody tr:hover { background: #0b1a31 !important; }
.tournament-admin-page table tbody td {
  padding: 12px 8px !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
  vertical-align: middle !important;
  color: #dbe7f5 !important;
  font-size: 11px !important;
  line-height: 1.3 !important;
}
/* Precise 100% allocation. */
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
.tournament-admin-page table td:nth-child(4) > div {
  min-width: 0 !important;
  max-width: 100% !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  white-space: normal !important;
}
.tournament-admin-page table td:nth-child(5),
.tournament-admin-page table td:nth-child(6) { text-align: center !important; }
.tournament-admin-page table td:nth-child(7) {
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}
.tournament-admin-page table th:last-child { text-align: center !important; }
.tournament-admin-page table td:last-child { padding: 8px 6px !important; }
.tournament-admin-page table td:last-child > div {
  display: grid !important;
  grid-template-columns: repeat(3,minmax(0,1fr)) !important;
  gap: 5px !important;
  width: 100% !important;
  max-width: 100% !important;
  align-items: stretch !important;
}
.tournament-admin-page table td:last-child button {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 32px !important;
  height: auto !important;
  padding: 5px 3px !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  line-height: 1.05 !important;
  font-size: 8px !important;
  border-radius: 8px !important;
}
.tournament-admin-page table td:last-child button svg { width: 12px !important; height: 12px !important; }
@media (max-width: 1100px) and (min-width: 768px) {
  .tournament-admin-page table tbody td { padding-left: 5px !important; padding-right: 5px !important; font-size: 10px !important; }
  .tournament-admin-page table th:nth-child(2), .tournament-admin-page table td:nth-child(2) { width: 21% !important; }
  .tournament-admin-page table th:nth-child(4), .tournament-admin-page table td:nth-child(4) { width: 14% !important; }
  .tournament-admin-page table th:nth-child(8), .tournament-admin-page table td:nth-child(8) { width: 20% !important; }
}
@media (max-width: 767px) {
  .tournament-admin-page { overflow-x: hidden !important; }
  .tournament-admin-page table { min-width: 0 !important; }
}
\`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-theme-v3] opening tag not found');
src = src.replace(opening, `${opening}${css}`);
fs.writeFileSync(path, src);
console.log('[patch-admin-theme-v3] matched registration admin to seeded dark theme and precision table layout');
