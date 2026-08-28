import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Mobile submenu items must bypass activeView/onNavigate. The public tournament
// pages have dedicated URLs, so label/path resolution is made explicit here.
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

// The mobile sidebar is a true viewport overlay. Render it through a portal so
// it cannot be clipped or trapped behind a transformed/overflow-hidden ancestor
// from the landing-page content. This also removes the class/stacking-context
// failure where the toggle changes to X while the drawer remains invisible.
if (!s.includes("import { createPortal } from 'react-dom';")) {
  s = s.replace("import React, { useState, useEffect, useCallback, memo } from 'react';", "import React, { useState, useEffect, useCallback, memo } from 'react';\nimport { createPortal } from 'react-dom';");
}

const overlayStart = "    <div className={`lg:hidden fixed inset-0 z-[2147483000] bg-black/70 backdrop-blur-sm transition-opacity duration-150 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}";
const asideEnd = "    </aside>";
const a = s.indexOf(overlayStart);
const b = a >= 0 ? s.indexOf(asideEnd, a) : -1;
if (a >= 0 && b > a && !s.slice(a, b).includes('createPortal(')) {
  const end = b + asideEnd.length;
  const drawer = s.slice(a, end);
  s = s.slice(0, a) + `{typeof document !== 'undefined' && createPortal(<>{${drawer}\n    </>}, document.body)}` + s.slice(end);
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-mobile-tournament-submenu-click] direct mobile tournament navigation + body-portal sidebar applied');
