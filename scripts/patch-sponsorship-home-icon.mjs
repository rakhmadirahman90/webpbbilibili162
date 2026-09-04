import fs from 'node:fs';

const path = 'src/components/PublicSponsorship.tsx';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes("import { useNavigate } from 'react-router-dom';")) {
  s = s.replace("import { getSiteSetting } from '../utils/siteSettingsHelper';", "import { getSiteSetting } from '../utils/siteSettingsHelper';\nimport { useNavigate } from 'react-router-dom';");
}
if (!s.includes('Home } from')) {
  s = s.replace("import { Handshake, Sparkles, RefreshCw } from 'lucide-react';", "import { Handshake, Sparkles, RefreshCw, Home } from 'lucide-react';");
}
if (!s.includes('const navigate = useNavigate();')) {
  s = s.replace("export default function PublicSponsorship() {", "export default function PublicSponsorship() {\n  const navigate = useNavigate();");
}
if (!s.includes('aria-label="Kembali ke Beranda"')) {
  const marker = '  return (\n    <main className="';
  const replacement = `  const goHome = () => {\n    try { navigate('/'); } catch { window.location.assign('/'); }\n  };\n\n  return (\n    <main className="relative `;
  if (s.includes(marker)) {
    s = s.replace(marker, replacement);
  } else {
    throw new Error('Sponsorship main marker not found');
  }
  s = s.replace(
    '<div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl flex-col justify-center">',
    '<button type="button" onClick={goHome} aria-label="Kembali ke Beranda" title="Beranda" className="fixed left-3 top-3 z-[100] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0b1428]/90 text-slate-300 shadow-lg backdrop-blur transition hover:border-amber-300/40 hover:bg-[#111d35] hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300/40 sm:left-5 sm:top-5 sm:h-11 sm:w-11"><Home size={18} strokeWidth={2.2} /></button>\n      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl flex-col justify-center">'
  );
}
fs.writeFileSync(path, s, 'utf8');
console.log('[patch-sponsorship-home-icon] consistent Beranda icon applied');
