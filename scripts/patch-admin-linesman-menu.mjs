import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const routePath = 'src/components/AdminRouteView.tsx';

function patch(path, replacements) {
  let src = fs.readFileSync(path, 'utf8');
  for (const [needle, replacement] of replacements) {
    if (src.includes(replacement)) continue;
    if (!src.includes(needle)) throw new Error(`[linesman] Patch target not found in ${path}: ${needle.slice(0, 120)}`);
    src = src.replace(needle, replacement);
  }
  fs.writeFileSync(path, src);
}

patch(sidebarPath, [
  ["  Wallet,\n  FileText,", "  Wallet,\n  Banknote,\n  FileText,"],
  ["{ name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true }, ", "{ name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true },\n        { name: 'Pembayaran Honor Linesman', path: 'honor-linesman', icon: Banknote, adminOnly: true }, "]
]);

patch(routePath, [
  ["import AdminSponsorship from './AdminSponsorship';", "import AdminSponsorship from './AdminSponsorship'; import AdminHonorLinesman from './AdminHonorLinesman';"],
  ["case'kas':return isAdmin?render(KasManager):<div className=\"p-4 md:p-8\"><PublicKasView/></div>;", "case'kas':return isAdmin?render(KasManager):<div className=\"p-4 md:p-8\"><PublicKasView/></div>;case'honor-linesman':return adminOnly(AdminHonorLinesman);"]
]);

console.log('[linesman] Admin menu and route patched.');
