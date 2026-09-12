import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const routePath=path.join(root,'src/components/AdminRouteView.tsx'); const sidebarPath=path.join(root,'src/components/Sidebar.tsx'); const registrationPath=path.join(root,'src/components/PendaftaranTurnamen.tsx');
const read=p=>fs.readFileSync(p,'utf8'); const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
let route=read(routePath);
if(!route.includes("import AdminKelolaTurnamen from './AdminKelolaTurnamen';")){
 const imp="import AdminSponsorship from './AdminSponsorship';";
 if(route.includes(imp)) route=route.replace(imp,`${imp} import AdminKelolaTurnamen from './AdminKelolaTurnamen';`);
}
if(!route.includes("case'kelola-turnamen':case'manajemen-turnamen':return adminOnly(AdminKelolaTurnamen);")){
 const anchor="case'turnamen-liga':return render(TournamentLeague);";
 if(route.includes(anchor)) route=route.replace(anchor,`${anchor}case'kelola-turnamen':case'manajemen-turnamen':return adminOnly(AdminKelolaTurnamen);`);
}
write(routePath,route);
let sidebar=read(sidebarPath);
if(!sidebar.includes("path: 'kelola-turnamen'")){
 const needle="{ name: 'Manajemen Atlet', path: 'atlet', icon: Users, adminOnly: true },";
 const addition="{ name: 'Kelola Turnamen', path: 'kelola-turnamen', icon: Trophy, adminOnly: true },";
 if(sidebar.includes(needle)) sidebar=sidebar.replace(needle,`${addition}\n        ${needle}`);
}
write(sidebarPath,sidebar);
let registration=read(registrationPath);
if(!registration.includes("tournament_id:activeTournament.id")&&!registration.includes('tournament_id: activeTournament.id')){
 const needles=["const payload={kode_pendaftaran:code,","const payload = { kode_pendaftaran: code,","const payload = {kode_pendaftaran:code,"];
 const n=needles.find(x=>registration.includes(x));
 if(n){const lookup="const{data:activeTournament,error:activeTournamentError}=await supabase.from('seeded_tournaments').select('id').eq('is_active',true).maybeSingle();if(activeTournamentError)throw activeTournamentError;if(!activeTournament?.id)throw new Error('Belum ada turnamen aktif. Silakan hubungi admin.');\n      ";registration=registration.replace(n,`${lookup}${n.replace('kode_pendaftaran:code','tournament_id:activeTournament.id,kode_pendaftaran:code')}`);write(registrationPath,registration);console.log('Patched registration auto-link');}else console.log('Registration auto-link pattern not found; skipped.');
}
console.log('Tournament manager patch complete');
