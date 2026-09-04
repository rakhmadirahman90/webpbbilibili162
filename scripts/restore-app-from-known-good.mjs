import fs from 'node:fs';

// IMPORTANT: The production source on main is authoritative; never restore an old App shell during builds.
const target = 'src/App.tsx';
const app = fs.readFileSync(target, 'utf8');
const handleNavigatePattern = /const\s+handleNavigate\s*=\s*\(\s*sectionId\s*:\s*string/g;
if (!handleNavigatePattern.test(app)) {
  throw new Error('[app-source-guard] Current src/App.tsx is missing handleNavigate. Refusing to build.');
}
const declarations = (app.match(/const\s+handleNavigate\s*=\s*\(\s*sectionId\s*:\s*string/g) || []).length;
if (declarations !== 1) throw new Error(`[app-source-guard] Expected exactly one handleNavigate declaration, found ${declarations}.`);
// Be tolerant of formatting differences (spaces/newlines/self-closing JSX style) while still
// requiring the real Navbar -> handleNavigate binding to exist before any build-time patch runs.
const navbarBindingPattern = /<Navbar\s+onNavigate=\{\s*handleNavigate\s*\}\s*\/>/;
if (!navbarBindingPattern.test(app)) throw new Error('[app-source-guard] Navbar callback binding is missing. Refusing to build.');
console.log('[app-source-guard] Using current main src/App.tsx; no legacy restoration performed.');
