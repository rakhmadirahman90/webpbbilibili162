import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __TOURNAMENT_ADMIN_RESPONSIVE_FINAL_V2__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-responsive-final] already applied');
  process.exit(0);
}

const css = '<style>{`\n' + marker + `
.tournament-admin-page{width:100%!important;min-height:100%!important;height:auto!important;max-height:none!important;overflow:visible!important;overflow-x:hidden!important;box-sizing:border-box!important;padding:14px 16px 24px!important;background:#020817!important;color:#e5edf9!important}
.tournament-admin-page>div{width:100%!important;max-width:none!important;min-height:0!important;height:auto!important;margin:0!important;display:flex!important;flex-direction:column!important;gap:12px!important}
.tournament-admin-page>div>header{flex:none!important;overflow:hidden!important;border:1px solid #17355b!important;border-radius:18px!important;background:#071326!important;box-shadow:0 12px 30px rgba(0,0,0,.22)!important}
.tournament-admin-page>div>header>div:first-child{padding:14px 16px!important;background:linear-gradient(110deg,#061224,#0b2342 52%,#071326)!important}
.tournament-admin-page>div>header h1{margin-top:7px!important;font-size:clamp(20px,2vw,30px)!important;line-height:1.1!important;color:#f8fafc!important}
.tournament-admin-page>div>header p{color:#9fb3cd!important}
.tournament-admin-page>div>header>div:last-child{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important;padding:8px!important;background:#071326!important}
.tournament-admin-page>div>header>div:last-child>div{min-width:0!important;min-height:58px!important;padding:8px 10px!important;border:1px solid #17355b!important;border-radius:11px!important;background:#0a172a!important}
.tournament-admin-page>div>section:not(:last-child){flex:none!important;border:1px solid #17355b!important;background:#071326!important;box-shadow:none!important}
.tournament-admin-page>div>section:not(:last-child)>div{display:grid!important;grid-template-columns:minmax(260px,1fr) repeat(3,minmax(145px,1fr)) 96px!important;gap:8px!important}
.tournament-admin-page>div>section:not(:last-child) input,.tournament-admin-page>div>section:not(:last-child) select,.tournament-admin-page>div>section:not(:last-child) button{min-width:0!important;min-height:40px!important;height:40px!important}
.tournament-admin-page>div>section:not(:last-child) input,.tournament-admin-page>div>section:not(:last-child) select{border-color:#234365!important;background:#0a172a!important;color:#e5edf9!important}
.tournament-admin-page>div>section:not(:last-child) select option{background:#0a172a!important;color:#e5edf9!important}
.tournament-admin-page>div>section:not(:last-child) label>span{color:#91a8c3!important}
.tournament-admin-page>div>section:not(:last-child) button{border-color:#234365!important;background:#0b1b31!important;color:#b8c9dd!important}
.tournament-admin-page>div>section:last-child{flex:none!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;border:1px solid #17355b!important;border-radius:16px!important;background:#071326!important;box-shadow:0 10px 26px rgba(0,0,0,.18)!important}
.tournament-admin-page>div>section:last-child>div:first-child{min-height:58px!important;padding:10px 14px!important;border-color:#17355b!important;background:linear-gradient(90deg,#08172b,#0b1d35)!important}
.tournament-admin-page>div>section:last-child>div:first-child h2{color:#f8fafc!important;font-size:14px!important}
.tournament-admin-page>div>section:last-child>div:first-child p{color:#8fa7c2!important}
.tournament-admin-page>div>section:last-child>div:first-child>span{color:#93c5fd!important;background:#0b2a4d!important}
.tournament-admin-page .participant-add-btn{display:inline-flex!important;min-height:34px!important;height:34px!important;align-items:center!important;justify-content:center!important;gap:6px!important;padding:0 12px!important;border:0!important;border-radius:9px!important;background:#1677ff!important;color:#fff!important;font-size:10px!important;font-weight:900!important;text-transform:uppercase!important;white-space:nowrap!important;box-shadow:0 6px 16px rgba(22,119,255,.22)!important}
.tournament-admin-page>div>section:last-child>.overflow-x-auto{width:100%!important;max-width:100%!important;overflow:visible!important;height:auto!important;max-height:none!important}
.tournament-admin-page table{width:100%!important;min-width:0!important;max-width:none!important;table-layout:fixed!important;border-collapse:collapse!important}
.tournament-admin-page table thead th{height:38px!important;padding:8px!important;background:#0a1b31!important;color:#8eabd0!important;border-bottom:1px solid #17355b!important;font-size:9px!important;line-height:1!important;white-space:nowrap!important}
.tournament-admin-page table tbody tr{height:58px!important;background:#071326!important;border-bottom:1px solid #132a47!important}
.tournament-admin-page table tbody tr:hover{background:#0b1b31!important}
.tournament-admin-page table tbody td{height:58px!important;padding:6px 8px!important;vertical-align:middle!important;color:#dbe7f5!important;font-size:10px!important;line-height:1.2!important;overflow:hidden!important}
.tournament-admin-page table th:nth-child(1),.tournament-admin-page table td:nth-child(1){width:4%!important;text-align:center!important}
.tournament-admin-page table th:nth-child(2),.tournament-admin-page table td:nth-child(2){width:23%!important}
.tournament-admin-page table th:nth-child(3),.tournament-admin-page table td:nth-child(3){width:12%!important}
.tournament-admin-page table th:nth-child(4),.tournament-admin-page table td:nth-child(4){width:14%!important}
.tournament-admin-page table th:nth-child(5),.tournament-admin-page table td:nth-child(5){width:10%!important}
.tournament-admin-page table th:nth-child(6),.tournament-admin-page table td:nth-child(6){width:10%!important}
.tournament-admin-page table th:nth-child(7),.tournament-admin-page table td:nth-child(7){width:10%!important}
.tournament-admin-page table th:nth-child(8),.tournament-admin-page table td:nth-child(8){width:17%!important}
.tournament-admin-page table td:nth-child(2)>div:first-child,.tournament-admin-page table td:nth-child(3)>div,.tournament-admin-page table td:nth-child(4)>div:first-child{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;overflow-wrap:anywhere!important}
.tournament-admin-page table td:nth-child(2)>div:last-child{color:#60a5fa!important}
.tournament-admin-page table td:nth-child(4)>div:last-child{color:#8299b4!important}
.tournament-admin-page table td:nth-child(7){white-space:nowrap!important;text-overflow:ellipsis!important}
.tournament-admin-page table td:last-child{overflow:visible!important;padding:5px 6px!important}
.tournament-admin-page table td:last-child>div{width:100%!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;align-items:center!important}
.tournament-admin-page table td:last-child button{width:100%!important;min-width:0!important;min-height:28px!important;height:28px!important;padding:3px 4px!important;border-radius:7px!important;font-size:7px!important;line-height:1!important;gap:3px!important;white-space:nowrap!important}
.tournament-admin-page table td:last-child button svg{width:10px!important;height:10px!important;flex:none!important}
.tournament-admin-page>div>section:last-child>div:last-child{min-height:48px!important;padding:7px 10px!important;border-color:#17355b!important;background:#071326!important}
.tournament-admin-page>div>section:last-child>div:last-child p{color:#8fa7c2!important}
.tournament-admin-page>div>section:last-child>div:last-child button{min-height:30px!important;height:30px!important;background:#0a172a!important;border-color:#234365!important;color:#b8c9dd!important}
@media(max-width:1023px){
.tournament-admin-page{padding:10px 10px 18px!important}
.tournament-admin-page>div{gap:9px!important}
.tournament-admin-page>div>header>div:first-child{padding:12px!important}
.tournament-admin-page>div>header h1{font-size:20px!important}
.tournament-admin-page>div>header>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.tournament-admin-page>div>section:not(:last-child)>div{grid-template-columns:1fr 1fr!important}
.tournament-admin-page>div>section:not(:last-child) label:first-child{grid-column:1/-1!important}
.tournament-admin-page>div>section:last-child>div:first-child{flex-wrap:wrap!important;gap:7px!important}
.tournament-admin-page>div>section:last-child>.overflow-x-auto{display:none!important}
.tournament-admin-page>div>section:last-child>.md\\:hidden{display:block!important}
.tournament-admin-page>div>section:last-child>.md\\:hidden article{background:#071326!important;border-bottom:1px solid #17355b!important}
.tournament-admin-page>div>section:last-child>.md\\:hidden article p{color:#91a8c3!important}
.tournament-admin-page .participant-add-btn{margin-left:auto!important}
}
@media(max-width:640px){
.tournament-admin-page{padding:8px!important}
.tournament-admin-page>div>header>div:last-child{grid-template-columns:1fr 1fr!important}
.tournament-admin-page>div>section:not(:last-child)>div{grid-template-columns:1fr!important}
.tournament-admin-page>div>section:not(:last-child) label:first-child{grid-column:auto!important}
.tournament-admin-page>div>section:last-child>div:first-child{min-height:62px!important;padding:9px 10px!important}
.tournament-admin-page>div>section:last-child>div:first-child h2{font-size:12px!important}
.tournament-admin-page .participant-add-btn{min-height:30px!important;height:30px!important;font-size:8px!important;padding:0 9px!important}
.tournament-admin-page>div>section:last-child>.md\\:hidden article{padding:11px!important}
.tournament-admin-page>div>section:last-child>.md\\:hidden article button{min-height:32px!important;height:32px!important}
}
`}</style>`;

const opening = 'return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
if (!src.includes(opening)) throw new Error('[patch-admin-responsive-final] opening tag not found');
src = src.replace(opening, `${opening}${css}`);

const realtime = '<span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 sm:inline-flex">Realtime</span>';
if (!src.includes('participant-add-btn') && src.includes(realtime)) {
  const add = '<button type="button" className="participant-add-btn" onClick={() => { window.location.href = \'/pendaftaran-turnamen\'; }}><span aria-hidden="true">+</span> Tambah Peserta</button>';
  src = src.replace(realtime, `${add}${realtime}`);
}

fs.writeFileSync(path, src);
console.log('[patch-admin-responsive-final] normal page scroll + responsive cards + proportional desktop table + visible participant actions applied');
