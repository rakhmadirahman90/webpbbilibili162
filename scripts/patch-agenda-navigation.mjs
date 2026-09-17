import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = "{ id: 'informasi', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },";
const item = "{ id: 'agenda', label: 'Agenda PB Bilibili 162', path: 'agenda', type: 'link', parent_id: 'informasi', order_index: 3 },";

if (!s.includes("id: 'agenda'")) {
  if (!s.includes(anchor)) throw new Error('[patch-agenda-navigation] Informasi menu anchor not found');
  s = s.replace(anchor, `${anchor}\n  ${item}`);
}

// Keep the public navigation resilient when navbar_settings is populated but does not yet contain Agenda.
const marker = "  if (!hasHome) result.unshift(DEFAULT_NAV_ITEMS[0]);";
const guard = "  const hasAgenda = result.some(i => isTopLevelMenuItem(i) === false && String(i.parent_id || '') === 'informasi' && normalizeNavigationPath(i.path) === 'agenda');\n  if (!hasAgenda) result.push(DEFAULT_NAV_ITEMS.find(i => i.id === 'agenda') || ${item});";
if (!s.includes('const hasAgenda = result.some')) {
  if (!s.includes(marker)) throw new Error('[patch-agenda-navigation] canonical navigation marker not found');
  s = s.replace(marker, `${guard}\n${marker}`);
}

// Preload the Agenda route so desktop/mobile navigation feels immediate.
const preloadAnchor = ": effective === 'faq'\n                  ? '/faq'";
if (!s.includes("effective === 'agenda'")) {
  const replacement = ": effective === 'agenda'\n                  ? '/agenda'\n                  : effective === 'faq'\n                  ? '/faq'";
  if (s.includes(preloadAnchor)) s = s.replace(preloadAnchor, replacement);
}

fs.writeFileSync(path, s);
console.log('[patch-agenda-navigation] Agenda added under Informasi and navigation fallback enabled.');
