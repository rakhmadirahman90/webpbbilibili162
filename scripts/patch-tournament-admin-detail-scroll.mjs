import fs from 'node:fs';

const cssPath = 'src/tournament-admin-modern.css';
let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Tournament admin detail modal mobile scroll fix. */';
if (!css.includes(marker)) {
  css += '\n\n' + marker + '\n.tournament-admin-page .fixed.inset-0{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;align-items:flex-start!important;justify-content:center!important;padding:12px!important}.tournament-admin-page .fixed.inset-0 > div{max-height:none!important;height:auto!important;overflow:visible!important;margin-top:0!important;margin-bottom:0!important}@media (max-width:767px){.tournament-admin-page .fixed.inset-0{min-height:100dvh!important;padding:10px!important;align-items:flex-start!important}.tournament-admin-page .fixed.inset-0 > div{width:100%!important;max-width:none!important;min-width:0!important;border-radius:20px!important}.tournament-admin-page .fixed.inset-0 button{touch-action:manipulation!important}}\n';
  fs.writeFileSync(cssPath, css);
}
console.log('[patch-tournament-admin-detail-scroll] safe scroll patch applied');
