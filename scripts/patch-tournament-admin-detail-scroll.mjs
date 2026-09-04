import fs from 'node:fs';

const cssPath = 'src/tournament-admin-modern.css';
let css = fs.readFileSync(cssPath, 'utf8');

const marker = '/* Tournament admin detail modal mobile scroll fix. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/*\n * The verification/detail dialog can be taller than a phone viewport.\n * Keep the overlay itself scrollable and let the dialog grow naturally so\n * every field (including both players and documents) remains reachable.\n */\n.tournament-admin-page .fixed.inset-0{\n  overflow-y:auto!important;\n  overflow-x:hidden!important;\n  -webkit-overflow-scrolling:touch!important;\n  overscroll-behavior:contain!important;\n  align-items:flex-start!important;\n  justify-content:center!important;\n  padding:12px!important;\n}\n.tournament-admin-page .fixed.inset-0 > div{\n  max-height:none!important;\n  height:auto!important;\n  overflow:visible!important;\n  margin-top:0!important;\n  margin-bottom:0!important;\n}\n@media (max-width:767px){\n  .tournament-admin-page .fixed.inset-0{\n    min-height:100dvh!important;\n    padding:10px!important;\n    align-items:flex-start!important;\n  }\n  .tournament-admin-page .fixed.inset-0 > div{\n    width:100%!important;\n    max-width:none!important;\n    min-width:0!important;\n    border-radius:20px!important;\n  }\n  .tournament-admin-page .fixed.inset-0 button{\n    touch-action:manipulation!important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css);
}

console.log('[patch-tournament-admin-detail-scroll] applied');
