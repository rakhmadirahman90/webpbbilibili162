import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// Mobile drawer fix: the Navbar uses backdrop-filter, which creates a stacking
// context/containing block. The drawer therefore must be rendered through a
// React portal directly into document.body.
if (!s.includes("import { createPortal } from 'react-dom';")) {
  s = s.replace(
    "import React, { useState, useEffect, useCallback, memo } from 'react';",
    "import React, { useState, useEffect, useCallback, memo } from 'react';\nimport { createPortal } from 'react-dom';"
  );
}

const marker = '    <div className={`lg:hidden fixed inset-0 z-[2147483000]';
const start = s.indexOf(marker);
const endTag = '    </aside>';
const end = start >= 0 ? s.indexOf(endTag, start) : -1;

if (start >= 0 && end > start) {
  const endPos = end + endTag.length;
  const block = s.slice(start, endPos);
  const portal = `{typeof document !== 'undefined' ? createPortal(<>${block}\n    </>, document.body) : null}`;
  s = s.slice(0, start) + portal + s.slice(endPos);
}

// Remove any stale duplicate portal expression if a previous build patch left
// one behind, then make the visible state independent of Tailwind transform
// generation. Inline positioning is intentional: it guarantees visibility even
// when another global responsive rule changes transform/overflow/z-index.
s = s.replace(/\{typeof document !== 'undefined' \? createPortal\(<>\{typeof document !== 'undefined' \? createPortal\(<>/g, '{typeof document !== \'undefined\' ? createPortal(<>');

const overlayStyle = " style={{ position: 'fixed', inset: 0, zIndex: 2147483000, display: mobileOpen ? 'block' : 'none' }}";
const drawerStyle = " style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: 'min(86vw, 350px)', maxWidth: 350, zIndex: 2147483001, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', visibility: mobileOpen ? 'visible' : 'hidden' }}";

if (!s.includes(overlayStyle)) {
  s = s.replace(
    'className={`lg:hidden fixed inset-0 z-[2147483000] bg-black/70 backdrop-blur-sm transition-opacity duration-150 ${mobileOpen ? \'opacity-100 pointer-events-auto\' : \'opacity-0 pointer-events-none\'}`}',
    'className="lg:hidden bg-black/70 backdrop-blur-sm"' + overlayStyle
  );
}
if (!s.includes(drawerStyle)) {
  s = s.replace(
    'className={`lg:hidden fixed inset-y-0 left-0 z-[2147483001] w-[min(86vw,350px)] max-w-[350px] bg-[#0b1224] border-r border-white/10 shadow-2xl flex flex-col overflow-hidden transition-transform duration-150 ease-out ${mobileOpen ? \'translate-x-0 pointer-events-auto\' : \'-translate-x-full pointer-events-none\'} touch-manipulation`}',
    'className="lg:hidden bg-[#0b1224] border-r border-white/10 shadow-2xl flex flex-col overflow-hidden touch-manipulation"' + drawerStyle
  );
}

const oldToggle = 'onClick={() => setMobileOpen(v => !v)}';
const newToggle = "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileOpen(v => !v); }}";
if (s.includes(oldToggle) && !s.includes(newToggle)) s = s.replace(oldToggle, newToggle);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-mobile-sidebar-portal-final] deterministic body-portal mobile sidebar applied');
