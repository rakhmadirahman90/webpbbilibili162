import fs from 'node:fs';

// IMPORTANT:
// Do not download/restore App.tsx from an old Git commit during Vercel builds.
// The production source on main is authoritative. The previous implementation
// fetched an older App shell on every prebuild, which could silently replace
// current routing/login fixes and make production behave differently from GitHub.
const target = 'src/App.tsx';
const app = fs.readFileSync(target, 'utf8');

if (!app.includes('const handleNavigate = (sectionId: string')) {
  throw new Error('[app-source-guard] Current src/App.tsx is missing handleNavigate. Refusing to build.');
}

const declarations = (app.match(/const handleNavigate = \(sectionId: string/g) || []).length;
if (declarations !== 1) {
  throw new Error(`[app-source-guard] Expected exactly one handleNavigate declaration, found ${declarations}.`);
}

if (!app.includes('<Navbar onNavigate={handleNavigate} />')) {
  throw new Error('[app-source-guard] Navbar callback binding is missing. Refusing to build.');
}

console.log('[app-source-guard] Using current main src/App.tsx; no legacy restoration performed.');
