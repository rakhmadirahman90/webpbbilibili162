import fs from 'node:fs';
const appPath='src/App.tsx';
let app=fs.readFileSync(appPath,'utf8');

// App.tsx is intentionally compact in the current build pipeline, so do not
// require the old pretty-printed function/return formatting.
const appFunctionPattern=/export default function App\s*\([^)]*\)\s*\{/;
if(!appFunctionPattern.test(app)) throw new Error('[runtime-navigation-guard] App component declaration not found');

// The navigation callback may be formatted compactly. Accept either spacing
// around the declaration while still requiring exactly one callback contract.
const handlePattern=/const\s+handleNavigate\s*=\s*\(\s*sectionId\s*:\s*string(?:\s*,[^)]*)?\)\s*=>/g;
const declarations=app.match(handlePattern)||[];
if(declarations.length!==1) throw new Error(`[runtime-navigation-guard] expected exactly one handleNavigate declaration, found ${declarations.length}`);

// Normalize every Navbar self-closing tag to the callback-bound form. This is
// idempotent and also handles compact JSX without relying on line breaks.
app=app.replace(/<Navbar\s*\/>/g,'<Navbar onNavigate={handleNavigate}/>');
if(!/<Navbar\s+onNavigate=\{handleNavigate\}\s*\/>/.test(app)) {
  throw new Error('[runtime-navigation-guard] Navbar callback binding missing');
}
fs.writeFileSync(appPath,app,'utf8');
console.log('[runtime-navigation-guard] compact App navigation contract verified');
