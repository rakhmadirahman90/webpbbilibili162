import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'src/index.css');
const marker = '/* ADMIN-BERITA-SAVE-BUTTON-V2 */';
let css = fs.readFileSync(cssPath, 'utf8');

if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Large, thumb-friendly mobile save action for the Admin Berita edit modal. */\n#admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] {\n  touch-action: manipulation !important;\n  -webkit-tap-highlight-color: transparent !important;\n  -webkit-user-select: none !important;\n  user-select: none !important;\n}\n\n@media (max-width: 767px) {\n  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] {\n    position: sticky !important;\n    bottom: max(0.5rem, env(safe-area-inset-bottom)) !important;\n    z-index: 100 !important;\n    width: 100% !important;\n    min-width: 100% !important;\n    min-height: 68px !important;\n    height: 68px !important;\n    margin: 0.75rem 0 0 !important;\n    padding: 0.9rem 1.25rem !important;\n    border-radius: 1.1rem !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    gap: 0.7rem !important;\n    font-size: 16px !important;\n    font-weight: 800 !important;\n    line-height: 1.1 !important;\n    letter-spacing: 0.01em !important;\n    box-shadow: 0 -10px 24px rgba(0,0,0,.55), 0 8px 22px rgba(0,0,0,.3) !important;\n    transform: translateZ(0);\n    cursor: pointer !important;\n  }\n\n  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] svg {\n    width: 22px !important;\n    height: 22px !important;\n    flex: 0 0 auto !important;\n  }\n\n  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"]:active:not(:disabled) {\n    transform: scale(.985) !important;\n  }\n\n  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"]:disabled {\n    opacity: .65 !important;\n    cursor: wait !important;\n  }\n\n  /* Keep the final form content clear of the sticky action. */\n  #admin-berita-page .fixed.z-\\[100\\] form {\n    padding-bottom: max(6.5rem, calc(1rem + env(safe-area-inset-bottom))) !important;\n  }\n}\n\n@media (min-width: 768px) {\n  #admin-berita-page .fixed.z-\\[100\\] form > button[type="submit"] {\n    min-height: 56px !important;\n    padding: 0.9rem 1.5rem !important;\n    border-radius: 0.95rem !important;\n    font-weight: 800 !important;\n    touch-action: manipulation !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('[patch-admin-berita-save-button] large touch-friendly save button CSS appended');
} else {
  console.log('[patch-admin-berita-save-button] already applied');
}
