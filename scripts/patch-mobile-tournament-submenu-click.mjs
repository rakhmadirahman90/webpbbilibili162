import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Mobile tournament submenu items must bypass activeView/onNavigate.
// They are public standalone pages and must navigate directly.
const old = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n    go(path, subPath);\n  };`;
const next = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string, label?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n\n    const p = normalizeNavigationPath(path);\n    const sp = normalizeNavigationPath(subPath || '');\n    const text = String(label || '').toLowerCase().trim();\n\n    if (text.includes('daftar seeded') || sp === 'seeded-peserta' || sp.includes('seeded-peserta')) {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran/seeded-peserta');\n      return;\n    }\n    if (\n      text.includes('daftar peserta diterima') ||\n      text.includes('daftar peserta turnamen') ||\n      sp === 'pendaftaran/peserta-diterima' ||\n      sp.includes('peserta-diterima') ||\n      sp === 'pendaftaran/peserta-turnamen' ||\n      sp.includes('peserta-turnamen')\n    ) {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran/peserta-diterima');\n      return;\n    }\n    if (text.includes('formulir pendaftaran turnamen') || p === 'pendaftaran-turnamen' || sp === 'pendaftaran-turnamen') {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      navigate('/pendaftaran-turnamen');\n      return;\n    }\n\n    go(path, subPath);\n  };`;
if (!s.includes(next)) {
  if (!s.includes(old)) throw new Error('[patch-mobile-tournament-submenu-click] handler marker not found');
  s = s.replace(old, next);
}

// Mobile submenu taps use click only. Pointer-down preloading can race with the
// drawer close/navigation transition on Android browsers.
const oldMap = `onPointerDown={() => { preloadNavigation(menu.path, sub.path); }} onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path)`;
const newMap = `onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path, sub.label)`;
if (s.includes(oldMap)) s = s.replace(oldMap, newMap);

// IMPORTANT: the drawer is a viewport overlay. Mount it through a React portal
// so no transformed/overflow/stacking ancestor from the landing page can hide it.
// The previous attempt generated invalid JSX; this version deliberately inserts
// the raw JSX block inside a Fragment with no extra braces around the block.
if (!s.includes("import { createPortal } from 'react-dom';")) {
  s = s.replace(
    "import React, { useState, useEffect, useCallback, memo } from 'react';",
    "import React, { useState, useEffect, useCallback, memo } from 'react';\nimport { createPortal } from 'react-dom';"
  );
}

const overlayMarker = '    <div className={`lg:hidden fixed inset-0 z-[2147483000]';
const asideEnd = '    </aside>';
const start = s.indexOf(overlayMarker);
const end = start >= 0 ? s.indexOf(asideEnd, start) : -1;

if (start >= 0 && end > start && !s.slice(start, end + asideEnd.length).includes('createPortal(')) {
  const endPos = end + asideEnd.length;
  const drawerBlock = s.slice(start, endPos);
  const portalBlock = `{typeof document !== 'undefined' ? createPortal(<>${drawerBlock}\n    </>, document.body) : null}`;
  s = s.slice(0, start) + portalBlock + s.slice(endPos);
}

// Stop parent click handlers from interfering with the toggle state.
const oldToggle = 'onClick={() => setMobileOpen(v => !v)}';
const newToggle = "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileOpen(v => !v); }}";
if (s.includes(oldToggle) && !s.includes(newToggle)) s = s.replace(oldToggle, newToggle);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-mobile-tournament-submenu-click] mobile tournament navigation + body portal sidebar applied');
