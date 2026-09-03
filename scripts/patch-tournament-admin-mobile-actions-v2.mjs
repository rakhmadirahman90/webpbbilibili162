import fs from 'node:fs';

const componentPath = 'src/components/AdminPendaftaranTurnamenModern.tsx';
const cssPath = 'src/tournament-admin-modern.css';

let component = fs.readFileSync(componentPath, 'utf8');
const oldActions = "return <div className={`flex ${full?'w-full':'justify-end'} flex-wrap gap-1.5`}>";
const newActions = "return <div className={`flex ${full?'mobile-actions w-full':'justify-end'} flex-wrap gap-1.5`}>";
if (component.includes(oldActions) && !component.includes("full?'mobile-actions w-full'")) {
  component = component.replace(oldActions, newActions);
  fs.writeFileSync(componentPath, component);
}

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Mobile action controls v2: compact icon-only grid with no clipped actions. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width:767px){\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article{\n    overflow:visible!important;\n  }\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions{\n    display:grid!important;\n    grid-template-columns:repeat(3,minmax(0,1fr))!important;\n    width:100%!important;\n    min-width:0!important;\n    max-width:none!important;\n    height:auto!important;\n    max-height:none!important;\n    overflow:visible!important;\n    align-items:stretch!important;\n    gap:6px!important;\n    margin-top:10px!important;\n    position:relative!important;\n    z-index:5!important;\n  }\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button{\n    width:100%!important;\n    min-width:0!important;\n    max-width:none!important;\n    height:40px!important;\n    min-height:40px!important;\n    max-height:none!important;\n    padding:0!important;\n    margin:0!important;\n    display:flex!important;\n    align-items:center!important;\n    justify-content:center!important;\n    gap:0!important;\n    font-size:0!important;\n    line-height:1!important;\n    white-space:nowrap!important;\n    overflow:visible!important;\n    border-radius:10px!important;\n    touch-action:manipulation!important;\n  }\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button svg{\n    display:block!important;\n    width:18px!important;\n    height:18px!important;\n    min-width:18px!important;\n    min-height:18px!important;\n    margin:0!important;\n    flex:0 0 auto!important;\n  }\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button[title]{\n    -webkit-tap-highlight-color:transparent!important;\n  }\n}\n@media (max-width:380px){\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions{\n    grid-template-columns:repeat(3,minmax(0,1fr))!important;\n    gap:5px!important;\n  }\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button{\n    height:38px!important;\n    min-height:38px!important;\n    border-radius:9px!important;\n  }\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button svg{\n    width:17px!important;\n    height:17px!important;\n    min-width:17px!important;\n    min-height:17px!important;\n  }\n}\n`;
  fs.writeFileSync(cssPath, css);
}

console.log('Tournament admin mobile action controls patched.');
