import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// Final invariant: Navbar requires an App-level navigation callback. Some
// earlier public-route patches can remove the callback or render Navbar
// without its required prop, which causes the production ReferenceError.
const appStart = app.indexOf('export default function App()');
const returnIndex = app.indexOf('  return (\n', appStart);
if (appStart < 0 || returnIndex < 0) {
  throw new Error('[final-handle-navigate] App structure not found');
}

if (!app.includes('const handleNavigate = (sectionId: string')) {
  const handler = `  const handleNavigate = (sectionId: string, subPath?: string) => {\n    const mainTarget = String(sectionId || '').toLowerCase().trim();\n    const subTarget = String(subPath || '').toLowerCase().trim();\n    if (!mainTarget || mainTarget === 'home' || mainTarget === 'beranda') {\n      setActiveView(null);\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n    if (mainTarget === 'atlet' || mainTarget === 'players' || mainTarget === 'player' || ['semua','senior','muda','taruna'].includes(subTarget)) {\n      setActiveView('atlet');\n      if (subTarget === 'senior') setActiveAthleteFilter('Senior');\n      else if (['muda','taruna'].includes(subTarget)) setActiveAthleteFilter('Muda');\n      else setActiveAthleteFilter('Semua');\n      return;\n    }\n    const aliases: Record<string, string> = {\n      ranking: 'peringkat', rankings: 'peringkat', gallery: 'galeri', news: 'berita',\n      about: 'sejarah', 'tentang-kami': 'sejarah', tentang: 'sejarah',\n      dokumen: 'dokumen-penting', documents: 'dokumen-penting',\n      struktur: 'struktur-organisasi', kontak: 'contact',\n      pendaftaran: 'register', players: 'atlet', player: 'atlet',\n      visi: 'visi-misi', misi: 'visi-misi'\n    };\n    const target = aliases[subTarget || mainTarget] || subTarget || mainTarget;\n    if (['pendaftaran-turnamen','daftar-turnamen','registrasi-turnamen'].includes(target)) {\n      window.history.pushState({}, '', '/pendaftaran-turnamen');\n      window.dispatchEvent(new PopStateEvent('popstate'));\n      return;\n    }\n    setActiveView(target);\n    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n  };\n\n`;
  app = app.slice(0, returnIndex) + handler + app.slice(returnIndex);
}

// Render Navbar with the callback it explicitly requires. Only replace the
// public shell occurrence; never touch admin/login routes.
const publicNavbar = '<Navbar />';
const publicNavbarWithProp = '<Navbar onNavigate={handleNavigate} />';
if (app.includes(publicNavbar)) {
  app = app.replace(publicNavbar, publicNavbarWithProp);
}

if (!app.includes('<Navbar onNavigate={handleNavigate} />')) {
  throw new Error('[final-handle-navigate] Navbar callback binding not present');
}
if (!app.includes('const handleNavigate = (sectionId: string')) {
  throw new Error('[final-handle-navigate] handleNavigate declaration not present');
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('[final-handle-navigate] navigation callback and Navbar binding verified');
