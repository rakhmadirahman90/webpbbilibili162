import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_ONE_SCREEN_FINAL__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-one-screen-final] already applied');
  process.exit(0);
}

const cssText = String.raw`
${marker}
/* Desktop: force the participant table to occupy exactly the available content width. */
.tournament-admin-page>div>section:last-child{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow:hidden!important}
.tournament-admin-page>div>section:last-child>.overflow-x-auto{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important}
.tournament-admin-page>div>section:last-child table{width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;box-sizing:border-box!important}
.tournament-admin-page>div>section:last-child table th,.tournament-admin-page>div>section:last-child table td{box-sizing:border-box!important;min-width:0!important;max-width:none!important}
/* The source table has a separate action cell without a visible header; explicitly reserve it. */
.tournament-admin-page>div>section:last-child table th:nth-child(1),.tournament-admin-page>div>section:last-child table td:nth-child(1){width:4%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(2),.tournament-admin-page>div>section:last-child table td:nth-child(2){width:22%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(3),.tournament-admin-page>div>section:last-child table td:nth-child(3){width:11%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(4),.tournament-admin-page>div>section:last-child table td:nth-child(4){width:14%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(5),.tournament-admin-page>div>section:last-child table td:nth-child(5){width:9%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(6),.tournament-admin-page>div>section:last-child table td:nth-child(6){width:9%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(7),.tournament-admin-page>div>section:last-child table td:nth-child(7){width:10%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(8),.tournament-admin-page>div>section:last-child table td:nth-child(8){width:21%!important}
.tournament-admin-page>div>section:last-child table th:nth-child(9),.tournament-admin-page>div>section:last-child table td:nth-child(9){width:0!important;max-width:0!important;padding:0!important;overflow:hidden!important}
.tournament-admin-page>div>section:last-child table td:last-child{overflow:hidden!important;padding:4px 5px!important}
.tournament-admin-page>div>section:last-child table td:last-child>div{width:100%!important;max-width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;align-items:center!important;box-sizing:border-box!important;overflow:hidden!important}
.tournament-admin-page>div>section:last-child table td:last-child button{width:100%!important;max-width:100%!important;min-width:0!important;height:30px!important;min-height:30px!important;padding:2px 3px!important;border-radius:7px!important;font-size:7px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;box-sizing:border-box!important}
.tournament-admin-page>div>section:last-child table td:last-child button span{min-width:0!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.tournament-admin-page>div>section:last-child table td:last-child button svg{width:9px!important;height:9px!important;flex:none!important}
.tournament-admin-page>div>section:last-child table tbody tr{height:58px!important}
.tournament-admin-page>div>section:last-child table tbody td{height:58px!important;padding-top:5px!important;padding-bottom:5px!important;vertical-align:middle!important}
.tournament-admin-page>div>section:last-child table td:nth-child(2)>div:first-child,.tournament-admin-page>div>section:last-child table td:nth-child(3)>div,.tournament-admin-page>div>section:last-child table td:nth-child(4)>div:first-child{min-width:0!important;max-width:100%!important;overflow:hidden!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow-wrap:anywhere!important;word-break:break-word!important}
.tournament-admin-page>div>section:last-child table td:nth-child(7){white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
@media(min-width:1024px){
.tournament-admin-page{padding-left:16px!important;padding-right:16px!important}
.tournament-admin-page>div{width:100%!important;max-width:none!important}
.tournament-admin-page>div>section:last-child{margin-left:0!important;margin-right:0!important}
}
@media(max-width:1023px){
.tournament-admin-page>div>section:last-child>.overflow-x-auto{overflow:hidden!important}
}
`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-one-screen-final] opening tag not found');
const styleNode = '<style dangerouslySetInnerHTML={{__html: cssText}} />';
src = src.replace(opening, `${opening}${styleNode}`);

fs.writeFileSync(path, src);
console.log('[patch-admin-one-screen-final] participant table forced to exact viewport width; right-side actions contained');
