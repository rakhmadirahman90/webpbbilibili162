import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Mobile tournament submenu items must bypass activeView/onNavigate.
// They are public standalone pages and must navigate directly.
const old = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n    go(path, subPath);\n  };`;
const next = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string, label?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n\n    const p = normalizeNavigationPath(path);\n    const sp = normalizeNavigationPath(subPath || '');\n    const text = String(label || '').toLowerCase().trim();\n\n    if (text.includes('daftar seeded') || sp === 'seeded-peserta' || sp.includes('seeded-peserta')) {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran/seeded-peserta');\n      return;\n    }\n    if (text.includes('formulir pendaftaran turnamen') || p === 'pendaftaran-turnamen' || sp === 'pendaftaran-turnamen') {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran-turnamen');\n      return;\n    }\n\n    go(path, subPath);\n  };`;
if (!s.includes(next)) {
  if (!s.includes(old)) throw new Error('[patch-mobile-tournament-submenu-click] handler marker not found');
  s = s.replace(old, next);
}

// Do not run pointer-down preloading on mobile submenu taps; it can race with
// the click/close transition on some Android browsers.
const oldMap = `onPointerDown={() => { preloadNavigation(menu.path, sub.path); }} onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path)}`;
const newMap = `onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path, sub.label)}`;
if (s.includes(oldMap)) s = s.replace(oldMap, newMap);

// Keep the drawer in Navbar's existing top-level JSX tree. The previous portal
// patch generated invalid nested JSX during prebuild; z-index and fixed positioning
// are already handled by the Navbar markup, so this patch intentionally avoids
// rewriting the JSX tree.

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-mobile-tournament-submenu-click] direct mobile tournament navigation applied safely');
