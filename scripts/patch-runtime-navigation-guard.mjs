import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// Final build-time invariant: every public App build must have a usable
// handleNavigate before Navbar/Footer are rendered. This is intentionally
// the last navigation patch in package.json so later public-route patches
// cannot leave a runtime ReferenceError behind.
if (!app.includes('const handleNavigate = (sectionId: string')) {
  const appStart = app.indexOf('export default function App()');
  const marker = '  return (\n';
  const index = app.indexOf(marker, appStart);
  if (appStart < 0 || index < 0) {
    throw new Error('[runtime-navigation-guard] App return marker not found');
  }

  const handler = `  // Final runtime-safe public navigation handler.\n  const handleNavigate = (sectionId: string, subPath?: string) => {\n    const mainTarget = String(sectionId || '').toLowerCase().trim();\n    const subTarget = String(subPath || '').toLowerCase().trim();\n\n    if (!mainTarget || mainTarget === 'home' || mainTarget === 'beranda') {\n      setActiveView(null);\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n\n    // Athlete submenu must remain on the athlete page while applying its filter.\n    if (mainTarget === 'atlet' || mainTarget === 'players' || mainTarget === 'player' || ['semua','senior','muda','taruna'].includes(subTarget)) {\n      if (['register','pendaftaran'].includes(subTarget)) {\n        setActiveView('register');\n      } else if (['peringkat','ranking','rankings'].includes(subTarget)) {\n        setActiveView('peringkat');\n      } else if (subTarget === 'prestasi') {\n        setActiveView('prestasi');\n      } else {\n        setActiveView('atlet');\n        if (subTarget === 'senior') setActiveAthleteFilter('Senior');\n        else if (['muda','taruna'].includes(subTarget)) setActiveAthleteFilter('Muda');\n        else setActiveAthleteFilter('Semua');\n      }\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n\n    const aliases: Record<string, string> = {\n      rankings: 'peringkat', ranking: 'peringkat',\n      gallery: 'galeri', news: 'berita',\n      about: 'sejarah', 'tentang-kami': 'sejarah', tentang: 'sejarah',\n      dokumen: 'dokumen-penting', documents: 'dokumen-penting',\n      struktur: 'struktur-organisasi', 'kontak': 'contact',\n      pendaftaran: 'register', players: 'atlet', player: 'atlet',\n      visi: 'visi-misi', misi: 'visi-misi'\n    };\n    const target = aliases[subTarget || mainTarget] || subTarget || mainTarget;\n\n    // Standalone tournament registration is a real router destination.\n    if (target === 'pendaftaran-turnamen' || target === 'daftar-turnamen' || target === 'registrasi-turnamen') {\n      window.history.pushState({}, '', '/pendaftaran-turnamen');\n      window.dispatchEvent(new PopStateEvent('popstate'));\n      return;\n    }\n\n    setActiveView(target);\n    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n  };\n\n`;

  app = app.slice(0, index) + handler + app.slice(index);
}

// Do not alter component APIs here; Navbar owns its own prop typing. The guard
// only guarantees the App-level callback exists when referenced by JSX.
fs.writeFileSync(appPath, app, 'utf8');
console.log('[runtime-navigation-guard] handleNavigate invariant verified');
