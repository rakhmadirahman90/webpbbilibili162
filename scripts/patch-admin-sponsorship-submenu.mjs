import fs from 'node:fs';

const path = 'src/components/Sidebar.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __ADMIN_SPONSORSHIP_SUBMENU_V1__ */';
if (src.includes(marker)) {
  console.log('[patch-admin-sponsorship-submenu] already applied');
  process.exit(0);
}

// Use the existing lucide icon when available; fall back to the already imported Star icon.
if (!src.includes('Handshake,') && !src.includes('Handshake\n')) {
  src = src.replace(/\n  RefreshCw\n\} from 'lucide-react';/, '\n  RefreshCw,\n  Handshake\n} from \'lucide-react\';');
}

const menuAnchor = "{ name: 'Audit Log Poin', path: 'audit-poin', icon: History, adminOnly: true },";
if (!src.includes(menuAnchor)) throw new Error('[patch-admin-sponsorship-submenu] member menu anchor not found');
src = src.replace(menuAnchor, `${menuAnchor}\n            { name: 'Sponsorship', path: 'sponsorship', icon: Handshake, adminOnly: true },`);

// Remove a standalone Sponsorship NavLink/button if a previous UI patch added one.
// This is intentionally limited to elements whose href/to points to the sponsorship route.
src = src.replace(/\n\s*<NavLink([^>]*?(?:to|href)=["'](?:\/admin\/)?sponsorship["'][^>]*)>[\s\S]*?<\/NavLink>/gi, '');
src = src.replace(/\n\s*<a([^>]*?href=["'](?:\/admin\/)?sponsorship["'][^>]*)>[\s\S]*?<\/a>/gi, '');

src += `\n\n${marker}\n`;
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-admin-sponsorship-submenu] Sponsorship moved into Manajemen Anggota & Atlet and standalone shortcut removed');
