import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = "{ id: 'informasi', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },";
const agendaItem = "{ id: 'agenda', label: 'Agenda', path: 'agenda', type: 'link', parent_id: 'informasi', order_index: 1 },";
const beritaItem = "{ id: 'berita', label: 'Berita', path: 'berita', type: 'link', parent_id: 'informasi', order_index: 2 },";
const jadwalItem = "{ id: 'jadwal', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', parent_id: 'informasi', order_index: 3 },";
const prestasiItem = "{ id: 'prestasi', label: 'Prestasi', path: 'prestasi', type: 'link', parent_id: 'informasi', order_index: 4 },";

// Remove top-level Agenda/Jadwal and normalize their labels/parents.
s = s.replace(/\n\s*\{[^\n]*id:\s*['\"]agenda['\"][^\n]*\},?/g, '');
s = s.replace(/\n\s*\{[^\n]*id:\s*['\"]jadwal['\"][^\n]*\},?/g, '');

// Remove existing Informasi child definitions; they will be recreated in alphabetical order.
s = s.replace(/\n\s*\{[^\n]*id:\s*['\"](berita|prestasi|agenda|jadwal)['\"][^\n]*parent_id:\s*['\"]informasi['\"][^\n]*\},?/g, '');

if (!s.includes(anchor)) throw new Error('[patch-agenda-navigation] Informasi menu anchor not found');
s = s.replace(anchor, `${anchor}\n  ${agendaItem}\n  ${beritaItem}\n  ${jadwalItem}\n  ${prestasiItem}`);

// Ensure database-driven navigation is normalized at runtime.
const marker = "  if (!hasHome) result.unshift(DEFAULT_NAV_ITEMS[0]);";
const guard = `  const infoChildren = result.filter(i => String(i.parent_id || '') === 'informasi' && ['agenda', 'berita', 'jadwal', 'prestasi'].includes(normalizeNavigationPath(i.path)));
  const cleaned = result.filter(i => !(['agenda', 'berita', 'jadwal', 'prestasi'].includes(normalizeNavigationPath(i.path)) && String(i.parent_id || '') === 'informasi'));
  const infoDefaults = [${agendaItem}, ${beritaItem}, ${jadwalItem}, ${prestasiItem}];
  for (const def of infoDefaults) {
    const found = infoChildren.find(i => normalizeNavigationPath(i.path) === normalizeNavigationPath(def.path));
    cleaned.push(found ? { ...found, parent_id: 'informasi', label: def.label, order_index: def.order_index } : def);
  }
  result.length = 0;
  result.push(...cleaned);`;
if (!s.includes('const infoChildren = result.filter')) {
  if (!s.includes(marker)) throw new Error('[patch-agenda-navigation] canonical navigation marker not found');
  s = s.replace(marker, `${guard}\n${marker}`);
}

// Preload Agenda and Jadwal routes.
const preloadAnchor = ": effective === 'faq'\n                  ? '/faq'";
if (!s.includes("effective === 'agenda'")) {
  const replacement = ": effective === 'agenda'\n                  ? '/agenda'\n                  : effective === 'faq'\n                  ? '/faq'";
  if (s.includes(preloadAnchor)) s = s.replace(preloadAnchor, replacement);
}

fs.writeFileSync(path, s);
console.log('[patch-agenda-navigation] Informasi submenu alphabetized and Agenda renamed.');
