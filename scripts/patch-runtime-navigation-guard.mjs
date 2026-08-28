import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes('const handleNavigate = (sectionId: string')) {
  const marker = '  return (\n';
  const index = s.indexOf(marker, s.indexOf('export default function App()'));
  if (index < 0) throw new Error('[runtime-navigation-guard] App return marker not found');

  const handler = `  // Runtime-safe public navigation handler. Some public-only builds render Navbar/Footer without the full legacy navigation layer.\n  const handleNavigate = (sectionId: string, subPath?: string) => {\n    const mainTarget = String(sectionId || '').toLowerCase().trim();\n    const subTarget = String(subPath || '').toLowerCase().trim();\n    const target = subTarget || mainTarget;\n    if (!target || target === 'home' || target === 'beranda') {\n      setActiveView(null);\n      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n      return;\n    }\n    const aliases: Record<string, string> = {\n      rankings: 'peringkat', ranking: 'peringkat', 'ranking-atlet': 'peringkat',\n      gallery: 'galeri', news: 'berita', about: 'sejarah', 'tentang-kami': 'sejarah',\n      'dokumen': 'dokumen-penting', documents: 'dokumen-penting',\n      'struktur': 'struktur-organisasi', 'kontak': 'contact',\n      'pendaftaran': 'register', players: 'atlet', player: 'atlet'\n    };\n    const finalTarget = aliases[target] || target;\n    if (finalTarget === 'pendaftaran-turnamen') {\n      window.history.pushState({}, '', '/pendaftaran-turnamen');\n      window.dispatchEvent(new PopStateEvent('popstate'));\n      return;\n    }\n    setActiveView(finalTarget);\n    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}\n  };\n\n`;
  s = s.slice(0, index) + handler + s.slice(index);
}

// Make Navbar safe even if a public-only build omits the callback prop.
s = s.replace('interface NavbarProps { onNavigate: (sectionId: string, tabId?: string) => void; }', 'interface NavbarProps { onNavigate?: (sectionId: string, tabId?: string) => void; }');
s = s.replace('export default function Navbar({ onNavigate }: NavbarProps) {', 'export default function Navbar({ onNavigate }: NavbarProps) {');

fs.writeFileSync(path, s, 'utf8');
console.log('[runtime-navigation-guard] handleNavigate guaranteed before App render');
