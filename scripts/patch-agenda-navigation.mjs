import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = "{ id: 'informasi', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },";
const agendaItem = "{ id: 'agenda', label: 'Agenda PB Bilibili 162', path: 'agenda', type: 'link', parent_id: 'informasi', order_index: 3 },";
const jadwalItem = "{ id: 'jadwal', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', parent_id: 'informasi', order_index: 4 },";

// Agenda and Jadwal Latihan belong only under Informasi, never as top-level navbar items.
const topLevelAgenda = /\n\s*\{[^\n]*id:\s*['\"]agenda['\"][^\n]*parent_id:\s*null[^\n]*\},?/g;
const topLevelJadwal = /\n\s*\{[^\n]*id:\s*['\"]jadwal['\"][^\n]*parent_id:\s*null[^\n]*\},?/g;
s = s.replace(topLevelAgenda, '').replace(topLevelJadwal, '');

if (!s.includes(anchor)) throw new Error('[patch-agenda-navigation] Informasi menu anchor not found');

// Normalize any existing Agenda/Jadwal entries to the Informasi submenu.
s = s.replace(/\{ id: ['\"]agenda['\"][^\n]*\},?/g, agendaItem);
s = s.replace(/\{ id: ['\"]jadwal['\"][^\n]*\},?/g, jadwalItem);

// Ensure both submenu items exist after Informasi.
if (!s.includes("id: 'agenda'")) s = s.replace(anchor, `${anchor}\n  ${agendaItem}`);
if (!s.includes("id: 'jadwal'")) s = s.replace(anchor, `${anchor}\n  ${jadwalItem}`);

// Keep database-driven navigation resilient: remove top-level Agenda/Jadwal and ensure both under Informasi.
const marker = "  if (!hasHome) result.unshift(DEFAULT_NAV_ITEMS[0]);";
const guard = `  const cleanedInfo = result.filter(i => !(isTopLevelMenuItem(i) && ['agenda', 'jadwal'].includes(normalizeNavigationPath(i.path))));
  const hasAgenda = cleanedInfo.some(i => String(i.parent_id || '') === 'informasi' && normalizeNavigationPath(i.path) === 'agenda');
  const hasJadwal = cleanedInfo.some(i => String(i.parent_id || '') === 'informasi' && normalizeNavigationPath(i.path) === 'jadwal');
  if (!hasAgenda) cleanedInfo.push(DEFAULT_NAV_ITEMS.find(i => i.id === 'agenda') || ${agendaItem});
  if (!hasJadwal) cleanedInfo.push(DEFAULT_NAV_ITEMS.find(i => i.id === 'jadwal') || ${jadwalItem});
  result.length = 0;
  result.push(...cleanedInfo);`;
if (!s.includes('const cleanedInfo = result.filter')) {
  if (!s.includes(marker)) throw new Error('[patch-agenda-navigation] canonical navigation marker not found');
  s = s.replace(marker, `${guard}\n${marker}`);
}

// Preload both routes.
const preloadAgendaAnchor = ": effective === 'faq'\n                  ? '/faq'";
if (!s.includes("effective === 'agenda'")) {
  const replacement = ": effective === 'agenda'\n                  ? '/agenda'\n                  : effective === 'faq'\n                  ? '/faq'";
  if (s.includes(preloadAgendaAnchor)) s = s.replace(preloadAgendaAnchor, replacement);
}

fs.writeFileSync(path, s);
console.log('[patch-agenda-navigation] Agenda and Jadwal Latihan restricted to Informasi submenu.');
