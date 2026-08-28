import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// Final build-time invariant: every public App build must have a usable
// handleNavigate before Navbar is rendered, and Navbar must receive it.
if (!app.includes('const handleNavigate = (sectionId: string')) {
  const appStart = app.indexOf('export default function App()');
  const marker = '  return (\n';
  const index = app.indexOf(marker, appStart);
  if (appStart < 0 || index < 0) {
    throw new Error('[runtime-navigation-guard] App return marker not found');
  }

  const handler = `  // Final runtime-safe public navigation handler.\n  const handleNavigate = (sectionId: string, subPath?: string) => {\n    const mainTarget = String(sectionId || '').toLowerCase().trim();\n    const subTarget = String(subPath || '').toLowerCase().trim();\n\n    if (!mainTarget || mainTarget === 'home' || mainTarget === 'beranda') {\n      setActiveView(null);\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n\n    if (mainTarget === 'atlet' || mainTarget === 'players' || mainTarget === 'player' || ['semua','senior','muda','taruna'].includes(subTarget)) {\n      if (['register','pendaftaran'].includes(subTarget)) setActiveView('register');\n      else if (['peringkat','ranking','rankings'].includes(subTarget)) setActiveView('peringkat');\n      else if (subTarget === 'prestasi') setActiveView('prestasi');\n      else {\n        setActiveView('atlet');\n        if (subTarget === 'senior') setActiveAthleteFilter('Senior');\n        else if (['muda','taruna'].includes(subTarget)) setActiveAthleteFilter('Muda');\n        else setActiveAthleteFilter('Semua');\n      }\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n\n    const aliases: Record<string, string> = {\n      rankings: 'peringkat', ranking: 'peringkat', gallery: 'galeri', news: 'berita',\n      about: 'sejarah', 'tentang-kami': 'sejarah', tentang: 'sejarah',\n      dokumen: 'dokumen-penting', documents: 'dokumen-penting',\n      struktur: 'struktur-organisasi', kontak: 'contact',\n      pendaftaran: 'register', players: 'atlet', player: 'atlet',\n      visi: 'visi-misi', misi: 'visi-misi'\n    };\n    const target = aliases[subTarget || mainTarget] || subTarget || mainTarget;\n\n    if (['pendaftaran-turnamen','daftar-turnamen','registrasi-turnamen'].includes(target)) {\n      window.history.pushState({}, '', '/pendaftaran-turnamen');\n      window.dispatchEvent(new PopStateEvent('popstate'));\n      return;\n    }\n\n    setActiveView(target);\n    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n  };\n\n`;

  app = app.slice(0, index) + handler + app.slice(index);
}

// Navbar declares onNavigate as a required prop. Ensure every public render
// passes the verified callback; this is deliberately idempotent.
app = app.replace(/<Navbar\s*\/>/g, '<Navbar onNavigate={handleNavigate} />');

if (!app.includes('const handleNavigate = (sectionId: string')) {
  throw new Error('[runtime-navigation-guard] handleNavigate declaration missing');
}
if (!app.includes('<Navbar onNavigate={handleNavigate} />')) {
  throw new Error('[runtime-navigation-guard] Navbar callback binding missing');
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('[runtime-navigation-guard] handleNavigate declaration and Navbar binding verified');
