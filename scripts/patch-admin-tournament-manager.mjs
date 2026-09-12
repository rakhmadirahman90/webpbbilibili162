import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const routePath=path.join(root,'src/components/AdminRouteView.tsx'); const sidebarPath=path.join(root,'src/components/Sidebar.tsx'); const registrationPath=path.join(root,'src/components/PendaftaranTurnamen.tsx'); const marker='ADMIN_TOURNAMENT_MANAGER_V3';
const read=p=>fs.readFileSync(p,'utf8'); const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
let route=read(routePath);
if(!route.includes(marker)){
 const imp="import AdminSponsorship from './AdminSponsorship';";
 if(route.includes(imp)) route=route.replace(imp,`${imp} import AdminKelolaTurnamen from './AdminKelolaTurnamen';`);
 const anchor="case'turnamen-liga':return render(TournamentLeague);";
 if(route.includes(anchor)) route=route.replace(anchor,`${anchor}case'kelola-turnamen':case'manajemen-turnamen':return adminOnly(AdminKelolaTurnamen);`);
 route=`/* ${marker} */\n${route}`; write(routePath,route); console.log('Patched AdminRouteView');
}
let sidebar=read(sidebarPath);
if(!sidebar.includes(marker)){
 const needle="{ name: 'Manajemen Atlet', path: 'atlet', icon: Users, adminOnly: true },";
 const addition="{ name: 'Kelola Turnamen', path: 'kelola-turnamen', icon: Trophy, adminOnly: true },";
 if(sidebar.includes(needle) && !sidebar.includes("path: 'kelola-turnamen'")) sidebar=sidebar.replace(needle,`${addition}\n        ${needle}`);
 sidebar=`/* ${marker} */\n${sidebar}`; write(sidebarPath,sidebar); console.log('Patched Sidebar');
}
try{
 let registration=read(registrationPath);
 if(!registration.includes(marker)){
  const needles=["const payload={kode_pendaftaran:code,","const payload = { kode_pendaftaran: code,","const payload = {kode_pendaftaran:code,"];
  const payloadNeedle=needles.find(x=>registration.includes(x));
  if(payloadNeedle){const lookup="const{data:activeTournament,error:activeTournamentError}=await supabase.from('seeded_tournaments').select('id').eq('is_active',true).maybeSingle();if(activeTournamentError)throw activeTournamentError;if(!activeTournament?.id)throw new Error('Belum ada turnamen aktif. Silakan hubungi admin.');\n      "; registration=registration.replace(payloadNeedle,`${lookup}${payloadNeedle.replace('kode_pendaftaran:code','tournament_id:activeTournament.id,kode_pendaftaran:code')}`); registration=`/* ${marker} */\n${registration}`; write(registrationPath,registration); console.log('Patched registration auto-link');}
  else console.log('Registration payload pattern differs; skipped auto-link without failing build.');
 }
}catch(e){console.warn('Registration auto-link patch skipped:',e?.message||e)}
