import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Mobile submenu items must bypass activeView/onNavigate. The public tournament
// pages have dedicated URLs, so label/path resolution is made explicit here.
const old = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n    go(path, subPath);\n  };`;
const next = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string, label?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n\n    const p = normalizeNavigationPath(path);\n    const sp = normalizeNavigationPath(subPath || '');\n    const text = String(label || '').toLowerCase().trim();\n\n    // These two entries are public standalone pages. Navigate directly so a\n    // mobile tap can never be swallowed by the parent activeView flow.\n    if (text.includes('daftar seeded') || sp === 'seeded-peserta' || sp.includes('seeded-peserta')) {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran/seeded-peserta');\n      return;\n    }\n    if (text.includes('formulir pendaftaran turnamen') || p === 'pendaftaran-turnamen' || sp === 'pendaftaran-turnamen') {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran-turnamen');\n      return;\n    }\n\n    go(path, subPath);\n  };`;
if (!s.includes(next)) {
  if (!s.includes(old)) throw new Error('[patch-mobile-tournament-submenu-click] handler marker not found');
  s = s.replace(old, next);
}

// Remove pointer-down preloading from the mobile submenu itself. On some mobile
// browsers this extra pointer phase can race with the click/close transition.
const oldMap = `onPointerDown={() => { preloadNavigation(menu.path, sub.path); }} onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path)}`;
const newMap = `onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path, sub.label)}`;
if (s.includes(oldMap)) s = s.replace(oldMap, newMap);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-mobile-tournament-submenu-click] direct mobile tournament submenu navigation applied');
