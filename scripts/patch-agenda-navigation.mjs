import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = "{ id: 'informasi', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },";
const agendaItem = "{ id: 'agenda', label: 'Agenda', path: 'agenda', type: 'link', parent_id: 'informasi', order_index: 1 }";
const beritaItem = "{ id: 'berita', label: 'Berita', path: 'berita', type: 'link', parent_id: 'informasi', order_index: 2 }";
const jadwalItem = "{ id: 'jadwal', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', parent_id: 'informasi', order_index: 3 }";
const prestasiItem = "{ id: 'prestasi', label: 'Prestasi', path: 'prestasi', type: 'link', parent_id: 'informasi', order_index: 4 }";

// Remove every canonical Agenda/Jadwal/Informasi-child definition from the build-time source.
s = s.replace(/\n\s*\{[^\n]*id:\s*['\"](agenda|jadwal|berita|prestasi)['\"][^\n]*\},?/g, '');

if (s.includes(anchor)) {
  s = s.replace(anchor, `${anchor}\n  ${agendaItem},\n  ${beritaItem},\n  ${jadwalItem},\n  ${prestasiItem},`);
} else {
  console.log('[patch-agenda-navigation] Informasi anchor already normalized by an earlier build patch; continuing with runtime normalization.');
}

// Normalize database-driven navigation without depending on the database parent's UUID.
const marker = "  if (!hasHome) result.unshift(DEFAULT_NAV_ITEMS[0]);";
const guard = `  const infoParent = result.find(i => normalizeNavigationPath(i.path) === 'informasi' || String(i.label || '').trim().toLowerCase() === 'informasi');
  const isInfoParent = (item) => {
    const pid = String(item?.parent_id || '');
    return !!infoParent && (pid === String(infoParent.id || '') || pid === String(infoParent.path || '') || pid.toLowerCase() === String(infoParent.label || '').trim().toLowerCase());
  };
  const canonicalInfoPaths = new Set(['agenda', 'berita', 'jadwal', 'prestasi']);
  const cleaned = result.filter(item => {
    const p = normalizeNavigationPath(item?.path || '');
    const topLevel = isTopLevelMenuItem(item);
    // Remove only duplicate top-level Agenda/Jadwal. Keep existing Information children
    // so the admin-controlled is_active flag is never overwritten during production build.
    return !(canonicalInfoPaths.has(p) && topLevel && (p === 'agenda' || p === 'jadwal'));
  });
  const infoParentId = infoParent?.id || 'informasi';
  const infoDefaults = [
    { id: 'agenda', label: 'Agenda', path: 'agenda', type: 'link', parent_id: infoParentId, order_index: 1, is_active: true },
    { id: 'berita', label: 'Berita', path: 'berita', type: 'link', parent_id: infoParentId, order_index: 2, is_active: true },
    { id: 'jadwal', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', parent_id: infoParentId, order_index: 3, is_active: true },
    { id: 'prestasi', label: 'Prestasi', path: 'prestasi', type: 'link', order_index: 4, is_active: true },
  ];
  for (const def of infoDefaults) {
    const existing = cleaned.find(item => normalizeNavigationPath(item?.path || '') === def.path && isInfoParent(item));
    if (!existing) cleaned.push(def);
  }
  result.length = 0;
  result.push(...cleaned);`;
if (!s.includes('const infoParent = result.find')) {
  if (!s.includes(marker)) throw new Error('[patch-agenda-navigation] canonical navigation marker not found');
  s = s.replace(marker, `${guard}\n${marker}`);
}

// Preload Agenda route.
const preloadAnchor = ": effective === 'faq'\n                  ? '/faq'";
if (!s.includes("effective === 'agenda'")) {
  const replacement = ": effective === 'agenda'\n                  ? '/agenda'\n                  : effective === 'faq'\n                  ? '/faq'";
  if (s.includes(preloadAnchor)) s = s.replace(preloadAnchor, replacement);
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-agenda-navigation] Informasi submenu normalized: Agenda, Berita, Jadwal Latihan, Prestasi.');