import fs from 'node:fs';

const cssPath = 'src/index.css';
if (!fs.existsSync(cssPath)) throw new Error('[patch-public-mobile-photo-head-focus] src/index.css not found');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* __PUBLIC_MOBILE_PHOTO_HEAD_FOCUS_V1__ */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Public accepted-participant photo preview: protect the head from mobile cropping. */\n@media (max-width: 767px) {\n  #public-peserta-turnamen .group > div:first-child {\n    aspect-ratio: 3 / 4 !important;\n    min-height: 150px !important;\n    max-height: 260px !important;\n    overflow: hidden !important;\n    background: #020617 !important;\n  }\n\n  #public-peserta-turnamen .group > div:first-child > img {\n    width: 100% !important;\n    height: 100% !important;\n    object-fit: contain !important;\n    object-position: 50% 18% !important;\n    display: block !important;\n    background: #020617 !important;\n  }\n\n  /* When the preview is opened, always show the entire portrait and keep the\n     visual focus toward the upper/face area without cropping the source. */\n  #public-peserta-turnamen .fixed img {\n    max-width: 100% !important;\n    max-height: calc(100dvh - 150px) !important;\n    width: auto !important;\n    height: auto !important;\n    object-fit: contain !important;\n    object-position: 50% 18% !important;\n  }\n\n  #public-peserta-turnamen .fixed {\n    padding: max(12px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)) !important;\n  }\n}\n\n@media (max-width: 380px) {\n  #public-peserta-turnamen .group > div:first-child {\n    min-height: 135px !important;\n    max-height: 220px !important;\n  }\n\n  #public-peserta-turnamen .fixed img {\n    max-height: calc(100dvh - 135px) !important;\n  }\n}\n\n@media (min-width: 768px) {\n  #public-peserta-turnamen .group > div:first-child > img {\n    object-fit: cover !important;\n    object-position: 50% 22% !important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('[patch-public-mobile-photo-head-focus] mobile participant photo focus applied.');
}
