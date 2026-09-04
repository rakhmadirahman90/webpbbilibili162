import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Mobile tournament/public submenu items must bypass activeView/onNavigate.
// This patch is intentionally compatible with the sponsorship navigation patch,
// which may already have replaced the original handler earlier in prebuild.
const handlerRegex = /  const handleMobileMenuClick = \(event: React\.MouseEvent<HTMLButtonElement>, path: string, subPath\?: string(?:, label\?: string)?\) => \{[\s\S]*?\n  \};/;
const next = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string, label?: string) => {
    event.preventDefault();
    event.stopPropagation();

    const p = normalizeNavigationPath(path || '');
    const sp = normalizeNavigationPath(subPath || '');
    const text = String(label || '').toLowerCase().trim();

    setOpenMenu(null);
    setMobileOpen(false);

    // Public tournament pages use dedicated routes and must not be swallowed by
    // the generic section navigation used by the main application shell.
    if (text.includes('daftar sponsorship') || text.includes('sponsorship') || ['sponsorship', 'sponsor', 'daftar-sponsorship'].includes(sp) || ['sponsorship', 'sponsor', 'daftar-sponsorship'].includes(p)) {
      try { navigate('/sponsorship'); } catch { window.location.assign('/sponsorship'); }
      return;
    }
    if (text.includes('daftar seeded') || sp === 'seeded-peserta' || sp.includes('seeded-peserta')) {
      try { navigate('/pendaftaran/seeded-peserta'); } catch { window.location.assign('/pendaftaran/seeded-peserta'); }
      return;
    }
    if (
      text.includes('daftar peserta diterima') ||
      text.includes('daftar peserta turnamen') ||
      sp === 'pendaftaran/peserta-diterima' ||
      sp.includes('peserta-diterima') ||
      sp === 'pendaftaran/peserta-turnamen' ||
      sp.includes('peserta-turnamen')
    ) {
      try { navigate('/pendaftaran/peserta-diterima'); } catch { window.location.assign('/pendaftaran/peserta-diterima'); }
      return;
    }
    if (text.includes('formulir pendaftaran turnamen') || p === 'pendaftaran-turnamen' || sp === 'pendaftaran-turnamen') {
      try { navigate('/pendaftaran-turnamen'); } catch { window.location.assign('/pendaftaran-turnamen'); }
      return;
    }

    go(path, subPath);
  };`;

if (handlerRegex.test(s)) {
  s = s.replace(handlerRegex, next);
} else {
  throw new Error('[patch-mobile-tournament-submenu-click] mobile handler boundary not found');
}

// Mobile submenu taps use click only. Pointer-down preloading can race with the
// drawer close/navigation transition on Android browsers.
s = s.replace(
  /onPointerDown=\{\(\) => \{ preloadNavigation\(menu\.path, sub\.path\); \}\} onClick=\{\(e\) => handleMobileMenuClick\(e, menu\.path, sub\.path\)(?:, sub\.label)?\}/,
  'onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path, sub.label)}'
);
s = s.replace(
  /onClick=\{\(e\) => handleMobileMenuClick\(e, menu\.path, sub\.path\)\}/,
  'onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path, sub.label)}'
);

// IMPORTANT: the drawer is a viewport overlay. Mount it through a React portal
// so no transformed/overflow/stacking ancestor from the landing page can hide it.
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
