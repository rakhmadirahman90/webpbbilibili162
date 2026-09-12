import fs from 'node:fs';
const route='src/components/AdminRouteView.tsx'; const sidebar='src/components/Sidebar.tsx';
let r=fs.readFileSync(route,'utf8');
if(!r.includes('AdminKeuanganTurnamen')){
 const imp="import AdminSponsorship from './AdminSponsorship';";
 if(!r.includes(imp)) throw new Error('AdminSponsorship import not found');
 r=r.replace(imp,`${imp} import AdminKeuanganTurnamen from './AdminKeuanganTurnamen';`);
 const anchor="case'turnamen-liga':return render(TournamentLeague);";
 if(!r.includes(anchor)) throw new Error('TournamentLeague route not found');
 r=r.replace(anchor,`${anchor}case'keuangan-turnamen':case'keuangan':case'laporan-keuangan-turnamen':return adminOnly(AdminKeuanganTurnamen);`);
 fs.writeFileSync(route,r);
}
let s=fs.readFileSync(sidebar,'utf8');
if(!s.includes("path: 'keuangan-turnamen'")){
 const anchor="{ name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true },";
 if(!s.includes(anchor)) throw new Error('Kelola Kas menu not found');
 s=s.replace(anchor,`${anchor}\n        { name: 'Keuangan Turnamen', path: 'keuangan-turnamen', icon: FileSpreadsheet, adminOnly: true },`);
 fs.writeFileSync(sidebar,s);
}
console.log('Tournament finance admin wired');
