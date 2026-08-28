import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Make the public registration menu consistently expose the seeded list,
// even when navbar_settings already contains a custom navigation configuration.
s = s.replace(
  "{ id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 },",
  "{ id: 'register', label: 'Pendaftaran Peserta', path: 'register', type: 'dropdown', parent_id: 'atlet', order_index: 5 },\n  { id: 'register-form', label: 'Formulir Pendaftaran Peserta', path: 'register', type: 'link', parent_id: 'register', order_index: 1 },\n  { id: 'register-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: 'register', order_index: 2 },"
);

const oldGet = "    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;\n    return list;";
const newGet = "    if (parent?.path === 'register' || String(parent?.label || '').toLowerCase() === 'pendaftaran peserta' || parentId === 'register') {\n      const seeded = { id: 'register-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: parent?.id || parentId, order_index: 99 };\n      const form = list.find(i => i?.path === 'register');\n      const withSeeded = list.some(i => i?.path === 'pendaftaran/seeded-peserta') ? list : [...list, seeded];\n      return withSeeded.length ? withSeeded.sort((a,b) => (a.order_index || 0) - (b.order_index || 0)) : [form || { id: 'register-form', label: 'Formulir Pendaftaran Peserta', path: 'register', type: 'link', parent_id: parent?.id || parentId, order_index: 1 }, seeded];\n    }\n    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;\n    return list;";
if (s.includes(oldGet)) s = s.replace(oldGet, newGet);

const oldGo = "    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);";
const newGo = "    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'pendaftaran/seeded-peserta') { navigate('/pendaftaran/seeded-peserta'); return; }\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);";
if (s.includes(oldGo)) s = s.replace(oldGo, newGo);

const oldPreload = "    if (!target) return;\n    try { warmupRouteData(target); } catch { /* prefetch must never block navigation */ }";
const newPreload = "    if (effective === 'pendaftaran/seeded-peserta') { void import('./PublicSeededPeserta'); return; }\n    if (!target) return;\n    try { warmupRouteData(target); } catch { /* prefetch must never block navigation */ }";
if (s.includes(oldPreload) && !s.includes("effective === 'pendaftaran/seeded-peserta'")) s = s.replace(oldPreload, newPreload);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-navbar] public seeded submenu applied');
