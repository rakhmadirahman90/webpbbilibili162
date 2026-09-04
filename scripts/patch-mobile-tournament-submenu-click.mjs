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

// The standalone Sponsorship route intentionally bypasses Navbar, so provide
// the same always-visible Beranda affordance on desktop and mobile. This is
// applied here because restore-app-from-known-good resets source files before
// every production build.
const sponsorPath = 'src/components/PublicSponsorship.tsx';
let sponsor = fs.readFileSync(sponsorPath, 'utf8');
if (!sponsor.includes("import { useNavigate } from 'react-router-dom';")) {
  sponsor = sponsor.replace("import { getSiteSetting } from '../utils/siteSettingsHelper';", "import { getSiteSetting } from '../utils/siteSettingsHelper';\nimport { useNavigate } from 'react-router-dom';");
}
if (!sponsor.includes('Home } from')) {
  sponsor = sponsor.replace("import { Handshake, Sparkles, RefreshCw } from 'lucide-react';", "import { Handshake, Sparkles, RefreshCw, Home } from 'lucide-react';");
}
if (!sponsor.includes('const navigate = useNavigate();')) {
  sponsor = sponsor.replace('export default function PublicSponsorship() {', 'export default function PublicSponsorship() {\n  const navigate = useNavigate();');
}
if (!sponsor.includes('aria-label="Kembali ke Beranda"')) {
  const mainMarker = '  return (\n    <main className="';
  if (!sponsor.includes(mainMarker)) throw new Error('[patch-mobile-tournament-submenu-click] sponsorship main marker not found');
  sponsor = sponsor.replace(mainMarker, '  const goHome = () => {\n    try { navigate(\'/\'); } catch { window.location.assign(\'/\'); }\n  };\n\n  return (\n    <main className="relative ');
  sponsor = sponsor.replace(
    '<div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl flex-col justify-center">',
    '<button type="button" onClick={goHome} aria-label="Kembali ke Beranda" title="Beranda" className="fixed left-3 top-3 z-[100] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#0b1428]/95 text-slate-300 shadow-xl backdrop-blur transition hover:border-amber-300/40 hover:bg-[#111d35] hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300/50 sm:left-5 sm:top-5 sm:h-12 sm:w-12"><Home size={19} strokeWidth={2.2} /></button>\n      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl flex-col justify-center">'
  );
}
fs.writeFileSync(sponsorPath, sponsor, 'utf8');
console.log('[patch-mobile-tournament-submenu-click] sponsorship Beranda icon applied for desktop + mobile');
