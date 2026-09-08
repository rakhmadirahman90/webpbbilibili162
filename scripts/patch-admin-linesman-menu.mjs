import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const routePath = 'src/components/AdminRouteView.tsx';
const honorPath = 'src/components/AdminHonorLinesman.tsx';
const honorCssPath = 'src/components/AdminHonorLinesman.css';

function patchSidebar() {
  let src = fs.readFileSync(sidebarPath, 'utf8');
  if (!src.includes('  Banknote,')) {
    const wallet = src.indexOf('  Wallet,');
    if (wallet >= 0) src = src.slice(0, wallet) + '  Banknote,\n' + src.slice(wallet);
  }

  // Remove any previous malformed/duplicate lines, then insert exactly one valid menu item.
  src = src.replace(/\s*\{\s*name:\s*['\"]Pembayaran Honor Linesman['\"],[^\n]*\},*\s*/g, '\n');
  if (!src.includes("path: 'honor-linesman'")) {
    const kasRe = /(\{\s*name:\s*['\"]Kelola Kas['\"],\s*path:\s*['\"]kas['\"],\s*icon:\s*Wallet,[^\n]*\})\s*,*/;
    if (kasRe.test(src)) {
      src = src.replace(kasRe, "$1,\n        { name: 'Pembayaran Honor Linesman', path: 'honor-linesman', icon: Banknote, adminOnly: true },");
    } else {
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

function patchHonorPage() {
  let src = fs.readFileSync(honorPath, 'utf8');
  if (!src.includes("import './AdminHonorLinesman.css';")) {
    const marker = "import * as XLSX from 'xlsx';";
    if (src.includes(marker)) src = src.replace(marker, marker + "\nimport './AdminHonorLinesman.css';");
  }
  src = src.replace(
    'return <div className="w-full min-h-full p-3 sm:p-5 md:p-8 text-slate-200">',
    'return <div className="honor-linesman-page w-full min-h-full p-3 sm:p-5 md:p-8 text-slate-200">'
  );
  src = src.replace(/'NAMA LINEsMAN'/g, "'NAMA LINEsMAN'").replace(/'HONOR LINEsMAN'/g, "'HONOR LINEsMAN'");
  fs.writeFileSync(honorPath, src);

  const css = `
.honor-linesman-page { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow-x: hidden; }
.honor-linesman-page *, .honor-linesman-page *::before, .honor-linesman-page *::after { box-sizing: border-box; }
.honor-linesman-page input, .honor-linesman-page select, .honor-linesman-page textarea { min-width: 0; max-width: 100%; }
.honor-linesman-page form > label { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.honor-linesman-page form > label > span { display: block; width: 100%; color: #94a3b8; font-size: 10px; line-height: 1.2; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.honor-linesman-page form > label > input,
.honor-linesman-page form > label > select,
.honor-linesman-page form > label > textarea { width: 100% !important; margin: 0 !important; }
.honor-linesman-page form > div { min-width: 0; }
.honor-linesman-page form textarea { min-height: 92px; resize: vertical; }
.honor-linesman-page form button { max-width: 100%; }
.honor-linesman-page > div.fixed { display: flex; align-items: flex-start; justify-content: center; }
.honor-linesman-page > div.fixed > div { width: min(100%, 720px); max-height: calc(100dvh - 32px); overflow-y: auto; overscroll-behavior: contain; }
.honor-linesman-page table { border-collapse: separate; border-spacing: 0; }

@media (min-width: 768px) {
  .honor-linesman-page form { align-items: start; }
  .honor-linesman-page form > label:last-child { grid-column: 1 / -1; }
}

@media (max-width: 767px) {
  .honor-linesman-page { padding: 12px !important; }
  .honor-linesman-page > div:first-child { margin-bottom: 14px; }
  .honor-linesman-page h1 { font-size: clamp(20px, 6vw, 28px) !important; line-height: 1.05; }
  .honor-linesman-page .honor-actions { width: 100%; }
  .honor-linesman-page > div:first-child > div:last-child { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .honor-linesman-page > div:first-child > div:last-child button { width: 100%; justify-content: center; min-height: 42px; padding-inline: 10px !important; }
  .honor-linesman-page .grid.grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
  .honor-linesman-page .grid.grid-cols-2 > div { min-width: 0; padding: 12px !important; }
  .honor-linesman-page .grid.grid-cols-2 > div > div:first-child span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .honor-linesman-page .overflow-x-auto { overflow-x: visible !important; }
  .honor-linesman-page table { min-width: 0 !important; width: 100% !important; display: block; }
  .honor-linesman-page table thead { display: none; }
  .honor-linesman-page table tbody { display: block; width: 100%; }
  .honor-linesman-page table tbody tr { display: block; width: 100%; margin: 10px 0; padding: 8px 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(7,13,26,.72); }
  .honor-linesman-page table tbody tr:first-child { margin-top: 0; }
  .honor-linesman-page table tbody td { display: grid; grid-template-columns: 105px minmax(0,1fr); gap: 10px; align-items: center; width: 100%; padding: 8px 4px !important; border: 0 !important; font-size: 11px !important; overflow-wrap: anywhere; }
  .honor-linesman-page table tbody td::before { color: #64748b; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
  .honor-linesman-page table tbody td:nth-child(1)::before { content: 'No'; }
  .honor-linesman-page table tbody td:nth-child(2)::before { content: 'Tanggal'; }
  .honor-linesman-page table tbody td:nth-child(3)::before { content: 'Linesman'; }
  .honor-linesman-page table tbody td:nth-child(4)::before { content: 'Pertandingan'; }
  .honor-linesman-page table tbody td:nth-child(5)::before { content: 'Lapangan'; }
  .honor-linesman-page table tbody td:nth-child(6)::before { content: 'Honor'; }
  .honor-linesman-page table tbody td:nth-child(7)::before { content: 'Status'; }
  .honor-linesman-page table tbody td:nth-child(8)::before { content: 'Tgl Bayar'; }
  .honor-linesman-page table tbody td:nth-child(9)::before { content: 'Metode'; }
  .honor-linesman-page table tbody td:nth-child(10)::before { content: 'Aksi'; }
  .honor-linesman-page table tbody td:last-child { grid-template-columns: 105px minmax(0,1fr); }
  .honor-linesman-page table tbody td:last-child > div { justify-content: flex-start; flex-wrap: wrap; }
  .honor-linesman-page table tbody tr:has(td[colspan]) td { display: block; text-align: center; padding: 28px 8px !important; }
  .honor-linesman-page table tbody tr:has(td[colspan]) td::before { display: none; }

  .honor-linesman-page > div.fixed { padding: 8px !important; align-items: flex-start; }
  .honor-linesman-page > div.fixed > div { width: 100%; max-height: calc(100dvh - 16px); margin-top: 0 !important; border-radius: 16px; }
  .honor-linesman-page > div.fixed > div > div:first-child { padding: 13px !important; position: sticky; top: 0; z-index: 2; background: #0b1224; }
  .honor-linesman-page > div.fixed > div > div:first-child h2 { font-size: 14px; }
  .honor-linesman-page > div.fixed form { display: grid !important; grid-template-columns: 1fr !important; gap: 10px !important; padding: 13px !important; }
  .honor-linesman-page > div.fixed form > label { display: flex !important; flex-direction: column !important; gap: 6px !important; width: 100% !important; }
  .honor-linesman-page > div.fixed form > label > span { width: 100% !important; }
  .honor-linesman-page > div.fixed form > label > input,
  .honor-linesman-page > div.fixed form > label > select,
  .honor-linesman-page > div.fixed form > label > textarea { width: 100% !important; min-height: 42px; }
  .honor-linesman-page > div.fixed form > label > textarea { min-height: 96px; }
  .honor-linesman-page > div.fixed form > div:last-child { position: sticky; bottom: -13px; z-index: 2; margin-inline: -13px; padding: 10px 13px; background: linear-gradient(to top, #0b1224 78%, transparent); }
  .honor-linesman-page > div.fixed form > div:last-child button { min-height: 44px; }
}

@media (max-width: 390px) {
  .honor-linesman-page { padding: 9px !important; }
  .honor-linesman-page > div:first-child > div:last-child { grid-template-columns: 1fr; }
  .honor-linesman-page .grid.grid-cols-2 { gap: 7px !important; }
  .honor-linesman-page .grid.grid-cols-2 > div { padding: 10px !important; }
  .honor-linesman-page .grid.grid-cols-2 > div > div:last-child { font-size: 16px !important; }
  .honor-linesman-page table tbody td { grid-template-columns: 88px minmax(0,1fr); }
  .honor-linesman-page table tbody td:last-child { grid-template-columns: 88px minmax(0,1fr); }
}
`;
  fs.writeFileSync(honorCssPath, css.trimStart());
}

patchSidebar();
patchRoute();
patchHonorPage();
console.log('[linesman] Admin menu, route, and responsive honor page patched safely.');
