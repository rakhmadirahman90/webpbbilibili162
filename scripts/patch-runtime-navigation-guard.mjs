import fs from 'node:fs';
const appPath='src/App.tsx';
let app=fs.readFileSync(appPath,'utf8');
const start=app.indexOf('export default function App()');
const ret=app.indexOf('  return (\n',start);
if(start<0||ret<0) throw new Error('[runtime-navigation-guard] App structure not found');
if(!app.includes('const handleNavigate = (sectionId: string')){
  throw new Error('[runtime-navigation-guard] App restoration must provide handleNavigate; refusing build');
}
app=app.replace(/<Navbar\s*\/>/g,'<Navbar onNavigate={handleNavigate} />');
const declarations=(app.match(/const handleNavigate = \(sectionId: string/g)||[]).length;
if(declarations!==1) throw new Error(`[runtime-navigation-guard] expected exactly one handleNavigate declaration, found ${declarations}`);
if(!app.includes('<Navbar onNavigate={handleNavigate} />')) throw new Error('[runtime-navigation-guard] Navbar callback binding missing');
fs.writeFileSync(appPath,app,'utf8');
console.log('[runtime-navigation-guard] navigation contract verified');
