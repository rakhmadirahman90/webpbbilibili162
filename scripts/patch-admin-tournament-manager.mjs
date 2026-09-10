import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'src/components/AdminRouteView.tsx');
const sidebarPath = path.join(root, 'src/components/Sidebar.tsx');
const marker = 'ADMIN_TOURNAMENT_MANAGER_V1';

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); }

let route = read(routePath);
if (!route.includes(marker)) {
  const importNeedle = "import AdminSponsorship from './AdminSponsorship';";
  if (!route.includes(importNeedle)) throw new Error('AdminSponsorship import not found');
  route = route.replace(importNeedle, `${importNeedle} import AdminKelolaTurnamen from './AdminKelolaTurnamen';`);
  const routeNeedle = "case'turnamen-liga':return render(TournamentLeague);";
  if (!route.includes(routeNeedle)) throw new Error('TournamentLeague route not found');
  route = route.replace(routeNeedle, `${routeNeedle}case'kelola-turnamen':case'manajemen-turnamen':return adminOnly(AdminKelolaTurnamen);`);
  route = `/* ${marker} */\n${route}`;
  write(routePath, route);
  console.log('Patched AdminRouteView');
} else console.log('AdminRouteView already patched');

let sidebar = read(sidebarPath);
if (!sidebar.includes(marker)) {
  const needle = "{ name: 'Manajemen Atlet', path: 'atlet', icon: Users, adminOnly: true },";
  if (!sidebar.includes(needle)) throw new Error('Manajemen Atlet menu not found');
  const addition = "{ name: 'Kelola Turnamen', path: 'kelola-turnamen', icon: Trophy, adminOnly: true },";
  sidebar = sidebar.replace(needle, `${addition}\n        ${needle}`);
  sidebar = `/* ${marker} */\n${sidebar}`;
  write(sidebarPath, sidebar);
  console.log('Patched Sidebar');
} else console.log('Sidebar already patched');
