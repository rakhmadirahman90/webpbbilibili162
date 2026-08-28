import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// Final production invariant: App must define the public navigation callback
// before rendering Navbar, and the callback must be passed explicitly.
const appStart = app.indexOf('export default function App()');
const returnMarker = '  return (\n';
const returnIndex = app.indexOf(returnMarker, appStart);
if (appStart < 0 || returnIndex < 0) {
  throw new Error('[runtime-navigation-guard] App structure not found');
}

if (!app.includes('const handleNavigate = (sectionId: string')) {
  const handler = `  const handleNavigate = (sectionId: string, subPath?: string) => {\n    const mainTarget = String(sectionId || '').toLowerCase().trim();\n    const subTarget = String(subPath || '').toLowerCase().trim();\n    if (!mainTarget || mainTarget === 'home' || mainTarget === 'beranda') {\n      setActiveView(null);\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n    if (mainTarget === 'atlet' || mainTarget === 'players' || mainTarget === 'player') {\n      if (['register','pendaftaran'].includes(subTarget)) setActiveView('register');\n      else if (['peringkat','ranking','rankings'].includes(subTarget)) setActiveView('peringkat');\n      else {\n        setActiveView('atlet');\n        if (subTarget === 'senior') setActiveAthleteFilter('Senior');\n        else if (['muda','taruna'].includes(subTarget)) setActiveAthleteFilter('Muda');\n        else setActiveAthleteFilter('Semua');\n      }\n      return;\n    }\n    const aliases: Record<string, string> = {\n      ranking:'peringkat', rankings:'peringkat', gallery:'galeri', galeri:'galeri',\n      news:'berita', about:'sejarah', 'tentang-kami':'sejarah', tentang:'sejarah',\n      dokumen:'dokumen-penting', documents:'dokumen-penting', struktur:'struktur-organisasi',\n      kontak:'contact', pendaftaran:'register', players:'atlet', player:'atlet',\n      visi:'visi-misi', misi:'visi-misi'\n    };\n    const target = aliases[subTarget || mainTarget] || subTarget || mainTarget;\n    if (['pendaftaran-turnamen','daftar-turnamen','registrasi-turnamen'].includes(target)) {\n      window.history.pushState({}, '', '/pendaftaran-turnamen');\n      window.dispatchEvent(new PopStateEvent('popstate'));\n      return;\n    }\n    if (target === 'pendaftaran/seeded-peserta') {\n      window.history.pushState({}, '', '/pendaftaran/seeded-peserta');\n      window.dispatchEvent(new PopStateEvent('popstate'));\n      return;\n    }\n    setActiveView(target);\n    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n  };\n\n`;
  app = app.slice(0, returnIndex) + handler + app.slice(returnIndex);
}

app = app.replace(/<Navbar\s*\/>/g, '<Navbar onNavigate={handleNavigate} />');

const declarations = (app.match(/const handleNavigate = \(sectionId: string/g) || []).length;
if (declarations !== 1) {
  throw new Error(`[runtime-navigation-guard] expected exactly one handleNavigate declaration, found ${declarations}`);
}
if (!app.includes('<Navbar onNavigate={handleNavigate} />')) {
  throw new Error('[runtime-navigation-guard] Navbar callback binding missing');
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('[runtime-navigation-guard] navigation contract verified');
