import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const routePath = 'src/components/AdminRouteView.tsx';

function patchSidebar() {
  let src = fs.readFileSync(sidebarPath, 'utf8');
  if (!src.includes('Banknote,')) {
    const wallet = src.indexOf('  Wallet,');
    if (wallet >= 0) src = src.slice(0, wallet) + '  Banknote,\n' + src.slice(wallet);
  }
  if (!src.includes("path: 'honor-linesman'")) {
    const kasRe = /(\{\s*name:\s*['\"]Kelola Kas['\"],\s*path:\s*['\"]kas['\"],\s*icon:\s*Wallet,[^\n]*\})/;
    if (kasRe.test(src)) src = src.replace(kasRe, "$1\n        { name: 'Pembayaran Honor Linesman', path: 'honor-linesman', icon: Banknote, adminOnly: true },");
    else {
      const section = src.indexOf("section: 'Administrasi & Keuangan'");
      if (section >= 0) {
        const pos = src.indexOf('items:', section);
        const brace = src.indexOf('[', pos);
        if (brace >= 0) src = src.slice(0, brace + 1) + "\n        { name: 'Pembayaran Honor Linesman', path: 'honor-linesman', icon: Banknote, adminOnly: true }," + src.slice(brace + 1);
      }
    }
  }
  fs.writeFileSync(sidebarPath, src);
}

function patchRoute() {
  let src = fs.readFileSync(routePath, 'utf8');
  if (!src.includes('AdminHonorLinesman')) {
    const marker = "import AdminSponsorship from './AdminSponsorship';";
    if (src.includes(marker)) src = src.replace(marker, marker + " import AdminHonorLinesman from './AdminHonorLinesman';");
    else src = src.replace(/(import [^;]+;)/, "$1 import AdminHonorLinesman from './AdminHonorLinesman';");
  }
  if (!src.includes("case'honor-linesman'")) {
    const kas = "case'kas':";
    const pos = src.indexOf(kas);
    if (pos >= 0) {
      const end = src.indexOf(';', pos);
      if (end >= 0) src = src.slice(0, end + 1) + "case'honor-linesman':return adminOnly(AdminHonorLinesman);" + src.slice(end + 1);
    } else {
      src = src.replace('default:return', "case'honor-linesman':return adminOnly(AdminHonorLinesman);default:return");
    }
  }
  fs.writeFileSync(routePath, src);
}

patchSidebar();
patchRoute();
console.log('[linesman] Admin menu and route patched safely.');
