import fs from 'node:fs';

const path = 'src/components/Sidebar.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __ADMIN_SPONSORSHIP_SUBMENU_V1__ */';
if (!src.includes(marker)) {
  if (!src.includes('Handshake,') && !src.includes('Handshake\n')) {
    src = src.replace(/\n  RefreshCw\n\} from 'lucide-react';/, '\n  RefreshCw,\n  Handshake\n} from \'lucide-react\';');
  }

  const menuAnchor = "{ name: 'Audit Log Poin', path: 'audit-poin', icon: History, adminOnly: true },";
  if (!src.includes(menuAnchor)) throw new Error('[patch-admin-sponsorship-submenu] member menu anchor not found');
  src = src.replace(menuAnchor, `${menuAnchor}\n            { name: 'Sponsorship', path: 'sponsorship', icon: Handshake, adminOnly: true },`);

  src = src.replace(/\n\s*<NavLink([^>]*?(?:to|href)=["'](?:\/admin\/)?sponsorship["'][^>]*)>[\s\S]*?<\/NavLink>/gi, '');
  src = src.replace(/\n\s*<a([^>]*?href=["'](?:\/admin\/)?sponsorship["'][^>]*)>[\s\S]*?<\/a>/gi, '');

  src += `\n\n${marker}\n`;
  fs.writeFileSync(path, src, 'utf8');
}

const publicPath = 'src/components/PublicSponsorship.tsx';
let publicSrc = fs.readFileSync(publicPath, 'utf8');
const publicMarker = '/* __PUBLIC_SPONSOR_TOTAL_V1__ */';
if (!publicSrc.includes(publicMarker)) {
  const anchor = `          </div>\n          {loading ?`;
  if (!publicSrc.includes(anchor)) throw new Error('[patch-admin-sponsorship-submenu] public sponsorship header anchor not found');
  const totalCard = `          </div>\n          {!loading && <div className="relative z-10 mx-auto mt-5 inline-flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-left shadow-lg"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200"><Handshake size={19}/></div><div><p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300/80">Total Sponsor</p><p className="text-xl font-black leading-6 text-white"><span>{sponsors.length}</span> <span className="text-xs font-bold text-slate-400">Sponsor Aktif</span></p></div></div>}\n          {loading ?`;
  publicSrc = publicSrc.replace(anchor, totalCard);
  publicSrc += `\n\n${publicMarker}\n`;
  fs.writeFileSync(publicPath, publicSrc, 'utf8');
}

console.log('[patch-admin-sponsorship-submenu] sponsorship submenu and public total sponsor card ensured');
