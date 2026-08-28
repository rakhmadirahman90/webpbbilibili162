import fs from 'node:fs';

const p='src/App.tsx';
let s=fs.readFileSync(p,'utf8');

// Move the two public pages outside all auth/loading/legacy activeView rendering.
// They are mounted directly from the router and therefore cannot blink because
// the legacy landing shell changes state.
s=s.replace("import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';", "import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';");
s=s.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
s=s.replace("const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));", "import PublicSeededPeserta from './components/PublicSeededPeserta';");

// Existing standalone routes are kept explicit and eager.
if(!s.includes('<Route path="/register" element={<RegistrationForm />} />')){
  s=s.replace('<Route path="/admin/*" element={<AdminDashboard />} />','<Route path="/register" element={<RegistrationForm />} />\n        <Route path="/pendaftaran" element={<RegistrationForm />} />\n        <Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />\n        <Route path="/admin/*" element={<AdminDashboard />} />');
}

// Never synchronize standalone URLs with activeView.
const fnStart=s.indexOf('function UrlSynchronizer(');
const fnEnd=s.indexOf('\n\nconst renderDescriptionWithLinks',fnStart);
if(fnStart>=0 && fnEnd>fnStart){
 const fn=s.slice(fnStart,fnEnd);
 const standaloneGuard="const standalone = path === '/register' || path === '/pendaftaran' || path === '/pendaftaran/seeded-peserta';";
 let nfn=fn;
 if(!nfn.includes('const standalone =')){
   nfn=nfn.replace('  const navigate = useNavigate();',"  const navigate = useNavigate();\n  const path = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n  "+standaloneGuard);
 }
 nfn=nfn.replace(/useEffect\(\(\) => \{\n\s*if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g,"useEffect(() => {\n    if (standalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
 s=s.slice(0,fnStart)+nfn+s.slice(fnEnd);
}

// Ensure the legacy full-page list cannot claim these routes.
s=s.replace("'register','pendaftaran','pendaftaran/seeded-peserta',",'');

fs.writeFileSync(p,'utf8'=== 'utf8' ? s : s);
console.log('[public-routes-first] public registration and seeded routes isolated');
