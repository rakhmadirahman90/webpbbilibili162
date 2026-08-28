import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Keep the public registration menu available even when navbar_settings
// contains a custom menu configuration.
s = s.replace(
  "{ id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 },",
  "{ id: 'register', label: 'Pendaftaran Peserta', path: 'register', type: 'dropdown', parent_id: 'atlet', order_index: 5 },\n  { id: 'register-form', label: 'Formulir Pendaftaran Peserta', path: 'register', type: 'link', parent_id: 'register', order_index: 1 },\n  { id: 'register-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: 'register', order_index: 2 },"
);

const oldGet = "    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;\n    return list;";
const newGet = "    if (parent?.path === 'register' || String(parent?.label || '').toLowerCase() === 'pendaftaran peserta' || parentId === 'register') {\n      const parentKey = parent?.id || parentId;\n      const form = { id: 'register-form', label: 'Formulir Pendaftaran Peserta', path: 'register', type: 'link', parent_id: parentKey, order_index: 1 };\n      const seeded = { id: 'register-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: parentKey, order_index: 2 };\n      const hasForm = list.some(i => i?.path === 'register');\n      const hasSeeded = list.some(i => i?.path === 'pendaftaran/seeded-peserta');\n      return [...(hasForm ? list : [form, ...list]), ...(hasSeeded ? [] : [seeded])].sort((a,b) => (a.order_index || 0) - (b.order_index || 0));\n    }\n    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;\n    return list;";
if (s.includes(oldGet)) s = s.replace(oldGet, newGet);

const oldGo = "    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);";
const newGo = "    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'pendaftaran/seeded-peserta') { navigate('/pendaftaran/seeded-peserta'); return; }\n      if (section === 'register') { navigate('/register'); return; }\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);";
if (s.includes(oldGo)) s = s.replace(oldGo, newGo);

const oldPreload = "    if (!target) return;\n    try { warmupRouteData(target); } catch { /* prefetch must never block navigation */ }";
const newPreload = "    if (effective === 'pendaftaran/seeded-peserta') { void import('./PublicSeededPeserta'); return; }\n    if (!target) return;\n    try { warmupRouteData(target); } catch { /* prefetch must never block navigation */ }";
if (s.includes(oldPreload) && !s.includes("effective === 'pendaftaran/seeded-peserta'")) s = s.replace(oldPreload, newPreload);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-navbar] registration + seeded public submenu applied');
