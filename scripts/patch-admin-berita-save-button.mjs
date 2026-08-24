import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'src/index.css');
const marker = '/* ADMIN-BERITA-SAVE-BUTTON-UX */';
const css = `
${marker}
/* Mobile save action: persistent, unobstructed and thumb-friendly. */
@media (max-width: 767px) {
  #admin-berita-page .fixed.z-\\[100\\] form {
    padding-bottom: max(6.5rem, calc(env(safe-area-inset-bottom) + 5.5rem)) !important;
  }

  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] {
    position: sticky !important;
    bottom: max(0.5rem, env(safe-area-inset-bottom)) !important;
    z-index: 99999 !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 64px !important;
    margin: 0.75rem 0 0 !important;
    padding: 0.9rem 1rem !important;
    border-radius: 1.15rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.7rem !important;
    touch-action: manipulation !important;
    -webkit-user-select: none !important;
    user-select: none !important;
    -webkit-tap-highlight-color: transparent !important;
    box-shadow: 0 -8px 24px rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.35) !important;
  }

  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] svg {
    width: 25px !important;
    height: 25px !important;
    flex: 0 0 auto !important;
  }

  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"]:active {
    transform: translateY(1px) scale(.985) !important;
  }

  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"]:focus-visible {
    outline: 3px solid rgba(147,197,253,.95) !important;
    outline-offset: 3px !important;
  }
}

@media (max-width: 380px) {
  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] {
    min-height: 60px !important;
    border-radius: 1rem !important;
    font-size: .92rem !important;
  }
}
`;

let cssFile = fs.readFileSync(cssPath, 'utf8');
if (!cssFile.includes(marker)) {
  fs.writeFileSync(cssPath, cssFile.trimEnd() + '\n' + css, 'utf8');
  console.log('[patch-admin-berita-save-button] save button UX applied');
} else {
  console.log('[patch-admin-berita-save-button] already applied');
}
