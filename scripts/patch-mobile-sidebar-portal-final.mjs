import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// The mobile drawer must not live inside the fixed Navbar stacking context.
// Render the complete overlay + drawer directly under document.body so it is
// always above the landing-page content and cannot be clipped by ancestors.
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

  if (!block.includes('createPortal(')) {
    s = s.slice(0, start) + portal + s.slice(endPos);
  }
}

// Make the mobile toggle resistant to parent click handlers and ensure the
// drawer state is controlled only by Navbar.
const oldToggle = 'onClick={() => setMobileOpen(v => !v)}';
const newToggle = "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileOpen(v => !v); }}";
if (s.includes(oldToggle) && !s.includes(newToggle)) s = s.replace(oldToggle, newToggle);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-mobile-sidebar-portal-final] mobile sidebar mounted via body portal');
