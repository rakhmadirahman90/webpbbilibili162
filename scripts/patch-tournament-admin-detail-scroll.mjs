import fs from 'node:fs';

const cssPath = 'src/tournament-admin-modern.css';
let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Tournament admin detail modal robust viewport scroll fix. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n` +
`.tournament-admin-page .fixed.inset-0{position:fixed!important;inset:0!important;z-index:1000!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;width:100vw!important;height:100dvh!important;max-width:100vw!important;max-height:100dvh!important;box-sizing:border-box!important;padding:12px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}\n` +
`.tournament-admin-page .fixed.inset-0>div{position:relative!important;width:min(1100px,100%)!important;max-width:1100px!important;min-width:0!important;max-height:calc(100dvh - 24px)!important;height:auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;margin:0!important;box-sizing:border-box!important}\n` +
`.tournament-admin-page .fixed.inset-0>div>*{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}\n` +
`.tournament-admin-page .fixed.inset-0 img{max-width:100%!important}\n` +
`.tournament-admin-page .fixed.inset-0 button{touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}\n` +
`body:has(.tournament-admin-page .fixed.inset-0){overflow:hidden!important}\n` +
`@media(max-width:767px){.tournament-admin-page .fixed.inset-0{padding:8px!important;height:100dvh!important;min-height:100dvh!important}.tournament-admin-page .fixed.inset-0>div{width:100%!important;max-width:none!important;max-height:calc(100dvh - 16px)!important;border-radius:18px!important}.tournament-admin-page .fixed.inset-0 button{min-height:40px!important}}\n`;
  fs.writeFileSync(cssPath, css);
}
console.log('[patch-tournament-admin-detail-scroll] robust detail modal viewport scroll/close fix applied');
