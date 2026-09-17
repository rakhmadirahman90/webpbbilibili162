import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = "{ id: 'informasi', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },";
const item = "{ id: 'agenda', label: 'Agenda PB Bilibili 162', path: 'agenda', type: 'link', parent_id: 'informasi', order_index: 3 },";

// Agenda must exist only as a submenu of Informasi, never as a top-level navbar item.
const agendaTopLevel = /\n\s*\{[^\n]*id:\s*['\"]agenda['\"][^\n]*parent_id:\s*null[^\n]*\},?/g;
s = s.replace(agendaTopLevel, '');

if (!s.includes("id: 'agenda'")) {
  if (!s.includes(anchor)) throw new Error('[patch-agenda-navigation] Informasi menu anchor not found');
  s = s.replace(anchor, `${anchor}\n  ${item}`);
} else {
  // Normalize an existing Agenda entry to the Informasi submenu.
  s = s.replace(/\{ id: ['\"]agenda['\"][^\n]*\},?/g, item);
}

// Keep the public navigation resilient when navbar_settings is populated: remove any top-level Agenda and ensure the submenu exists.
const marker = "  if (!hasHome) result.unshift(DEFAULT_NAV_ITEMS[0]);";
const guard = `  const cleanedAgenda = result.filter(i => !(isTopLevelMenuItem(i) && normalizeNavigationPath(i.path) === 'agenda'));
  const hasAgenda = cleanedAgenda.some(i => String(i.parent_id || '') === 'informasi' && normalizeNavigationPath(i.path) === 'agenda');
  if (!hasAgenda) cleanedAgenda.push(DEFAULT_NAV_ITEMS.find(i => i.id === 'agenda') || ${item});
  result.length = 0;
  result.push(...cleanedAgenda);`;
if (!s.includes('const cleanedAgenda = result.filter')) {
  if (!s.includes(marker)) throw new Error('[patch-agenda-navigation] canonical navigation marker not found');
  s = s.replace(marker, `${guard}\n${marker}`);
}

// Preload the Agenda route so the Informasi > Agenda submenu feels immediate.
const preloadAnchor = ": effective === 'faq'\n                  ? '/faq'";
if (!s.includes("effective === 'agenda'")) {
  const replacement = ": effective === 'agenda'\n                  ? '/agenda'\n                  : effective === 'faq'\n                  ? '/faq'";
  if (s.includes(preloadAnchor)) s = s.replace(preloadAnchor, replacement);
}

fs.writeFileSync(path, s);
console.log('[patch-agenda-navigation] Agenda restricted to Informasi submenu.');
