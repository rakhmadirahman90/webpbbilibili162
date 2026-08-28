import fs from 'node:fs';
import https from 'node:https';

// Restore the verified App shell before applying public-page patches.
// The restored source MUST contain its own navigation handler so no render can
// ever reference an undeclared handleNavigate symbol.
const url = 'https://raw.githubusercontent.com/rakhmadirahman90/webpbbilibili162/ea709840da2abaaa784defc8fb777b252ad650ac/src/App.tsx';
const target = 'src/App.tsx';
const fetchText = (input) => new Promise((resolve, reject) => {
  https.get(input, { headers: { 'User-Agent': 'PB-Bilibili-162-build' } }, (res) => {
    if (res.statusCode !== 200) { reject(new Error(`Failed to fetch known-good App.tsx: HTTP ${res.statusCode}`)); res.resume(); return; }
    let data = ''; res.setEncoding('utf8'); res.on('data', c => { data += c; }); res.on('end', () => resolve(data));
  }).on('error', reject);
});
const original = await fetchText(url);
let app = original.replace("import PwaInstallNotification from './components/PwaInstallNotification';", "import PwaInstallNotification from './components/PwaInstallNotification';\nimport AdminDashboard from './components/AdminDashboard';");
app = app.replace("const AdminDashboard = lazy(() => import('./components/AdminDashboard'));\n", '');
const start = app.indexOf('export default function App()');
const ret = app.indexOf('  return (\n', start);
if (start < 0 || ret < 0) throw new Error('Unable to locate App component return boundary.');
if (!app.includes('const handleNavigate = (sectionId: string')) {
  const handler = `  const handleNavigate = (sectionId: string, subPath?: string) => {\n    const mainTarget = String(sectionId || '').toLowerCase().trim();\n    const subTarget = String(subPath || '').toLowerCase().trim();\n    const target = subTarget || mainTarget;\n    if (!target || target === 'home' || target === 'beranda') { setActiveView(null); return; }\n    if (mainTarget === 'atlet' || mainTarget === 'players' || mainTarget === 'player') { setActiveView(['register','pendaftaran'].includes(subTarget) ? 'register' : ['peringkat','ranking','rankings'].includes(subTarget) ? 'peringkat' : 'atlet'); return; }\n    const aliases: Record<string,string> = { ranking:'peringkat', rankings:'peringkat', gallery:'galeri', news:'berita', about:'sejarah', tentang:'sejarah', dokumen:'dokumen-penting', documents:'dokumen-penting', struktur:'struktur-organisasi', kontak:'contact', pendaftaran:'register', players:'atlet', player:'atlet', visi:'visi-misi', misi:'visi-misi' };\n    const resolved = aliases[target] || target;\n    if (resolved === 'pendaftaran-turnamen' || resolved === 'daftar-turnamen' || resolved === 'registrasi-turnamen' || resolved === 'pendaftaran/seeded-peserta') { window.history.pushState({}, '', '/' + resolved); window.dispatchEvent(new PopStateEvent('popstate')); return; }\n    setActiveView(resolved);\n    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n  };\n\n`;
  app = app.slice(0, ret) + handler + app.slice(ret);
}
app = app.replace(/<Navbar\s*\/>/g, '<Navbar onNavigate={handleNavigate} />');
if ((app.match(/const handleNavigate = \(sectionId: string/g) || []).length !== 1) throw new Error('Navigation guard: expected exactly one handleNavigate.');
if (!app.includes('<Navbar onNavigate={handleNavigate} />')) throw new Error('Navigation guard: Navbar binding missing.');
fs.writeFileSync(target, app, 'utf8');
console.log('Verified App navigation contract.');
