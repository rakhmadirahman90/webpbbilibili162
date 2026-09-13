import fs from 'node:fs';

const cssPath = 'src/index.css';
const marker = '/* ADMIN EDIT DATA — MOBILE + DESKTOP NO-CLIP FIX v1 */';

if (!fs.existsSync(cssPath)) {
  console.warn('[patch-admin-edit-responsive] src/index.css not found; skipped.');
} else {
  let css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes(marker)) {
    css += `

${marker}
/* Keep every admin edit/create dialog inside the real viewport. */
body:has(#admin-sidebar) { overflow-x: hidden !important; }
body:has(#admin-sidebar) .fixed.inset-0 {
  box-sizing: border-box !important;
  width: 100vw !important;
  max-width: 100vw !important;
  min-width: 0 !important;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior: contain !important;
}
body:has(#admin-sidebar) .fixed.inset-0 > div {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: calc(100vw - 24px) !important;
  min-width: 0 !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
body:has(#admin-sidebar) .fixed.inset-0 form,
body:has(#admin-sidebar) .fixed.inset-0 [role="dialog"] {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow-x: hidden !important;
}
body:has(#admin-sidebar) .fixed.inset-0 form > *,
body:has(#admin-sidebar) .fixed.inset-0 [role="dialog"] > * {
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
body:has(#admin-sidebar) .fixed.inset-0 label,
body:has(#admin-sidebar) .fixed.inset-0 input,
body:has(#admin-sidebar) .fixed.inset-0 select,
body:has(#admin-sidebar) .fixed.inset-0 textarea,
body:has(#admin-sidebar) .fixed.inset-0 button {
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
body:has(#admin-sidebar) .fixed.inset-0 input,
body:has(#admin-sidebar) .fixed.inset-0 select,
body:has(#admin-sidebar) .fixed.inset-0 textarea { width: 100% !important; }

/* Gallery editor: balanced desktop layout and a single safe column on phones. */
body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] > div { max-width: min(100%, 1024px) !important; }
body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form {
  max-height: calc(100dvh - 24px) !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior: contain !important;
}
body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form > div { min-width: 0 !important; }

@media (max-width: 767px) {
  body:has(#admin-sidebar) .fixed.inset-0 {
    align-items: flex-start !important;
    padding-top: max(10px, env(safe-area-inset-top)) !important;
    padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
  }
  body:has(#admin-sidebar) .fixed.inset-0 > div,
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] > div {
    max-width: calc(100vw - 20px) !important;
    min-height: 0 !important;
  }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form {
    max-height: calc(100dvh - 20px) !important;
    border-radius: 20px !important;
  }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form > div:nth-child(2) {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 16px !important;
    padding: 16px !important;
  }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form > div:nth-child(2) > div { width: 100% !important; min-width: 0 !important; }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form > div:first-child { padding: 16px !important; }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form > div:last-child {
    padding: 16px !important;
    position: sticky !important;
    bottom: 0 !important;
    z-index: 5 !important;
    background: #0d1423 !important;
  }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form > div:last-child button { width: 100% !important; min-height: 48px !important; }
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form input,
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form select,
  body:has(#admin-sidebar) .fixed.inset-0[class*="z-[250]"] form textarea { font-size: 16px !important; }
}

@media (min-width: 768px) {
  body:has(#admin-sidebar) .fixed.inset-0 { padding: 24px !important; }
  body:has(#admin-sidebar) .fixed.inset-0 > div { max-width: min(100%, 1200px) !important; }
}
`;
    fs.writeFileSync(cssPath, css);
    console.log('[patch-admin-edit-responsive] admin edit/create dialogs are now viewport-safe and responsive.');
  } else {
    console.log('[patch-admin-edit-responsive] already applied.');
  }
}
