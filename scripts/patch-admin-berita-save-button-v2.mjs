import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cssPath = path.join(root, 'src/index.css');
const marker = '/* ADMIN-BERITA-SAVE-BUTTON-V2 */';

const css = `\n${marker}\n/* Make the Edit Berita save action reliably tappable on mobile. */\n@media (max-width: 767px) {\n  /* Keep the edit modal above floating widgets/overlays that can steal taps. */\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] {\n    z-index: 2147483000 !important;\n  }\n\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] form > button[type="submit"] {\n    position: sticky !important;\n    bottom: 0 !important;\n    z-index: 2147483647 !important;\n    isolation: isolate !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    width: 100% !important;\n    min-width: 100% !important;\n    min-height: 72px !important;\n    height: 72px !important;\n    margin: 0.75rem 0 0 !important;\n    padding: 0.75rem 1.25rem !important;\n    border-radius: 1.25rem !important;\n    touch-action: manipulation !important;\n    -webkit-tap-highlight-color: transparent !important;\n    pointer-events: auto !important;\n    user-select: none !important;\n    cursor: pointer !important;\n    box-sizing: border-box !important;\n  }\n\n  /* Expand the practical touch target without changing the visual size. */\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] form > button[type="submit"]::after {\n    content: "";\n    position: absolute;\n    inset: -8px;\n    z-index: -1;\n    border-radius: 1.4rem;\n    pointer-events: auto;\n  }\n\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] form > button[type="submit"] svg {\n    width: 28px !important;\n    height: 28px !important;\n    flex: 0 0 auto !important;\n    pointer-events: none !important;\n  }\n\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] form > button[type="submit"] span {\n    pointer-events: none !important;\n  }\n\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] form > button[type="submit"]:active {\n    transform: scale(0.985) !important;\n  }\n}\n\n@media (min-width: 768px) {\n  body:has(input[placeholder="CARI JUDUL BERITA..."]) .fixed.inset-0.z-\\[100\\] form > button[type="submit"] {\n    min-height: 58px !important;\n    touch-action: manipulation !important;\n  }\n}\n`;

let cssFile = fs.readFileSync(cssPath, 'utf8');
if (!cssFile.includes(marker)) {
  fs.writeFileSync(cssPath, cssFile.trimEnd() + '\n' + css, 'utf8');
  console.log('[patch-admin-berita-save-button-v2] save button touch target patch appended');
} else {
  console.log('[patch-admin-berita-save-button-v2] patch already present');
}
