import fs from 'node:fs';
const p='src/App.tsx';
let s=fs.readFileSync(p,'utf8');
if(!s.includes("SeededTurnamenIO")) s=s.replace("const SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));","const SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));\nconst SeededTurnamenIO = lazy(() => import('./components/SeededTurnamenIO'));" );
s=s.replace('<Route path="seeded-turnamen" element={isAdmin ? <SeededTurnamen /> : <Navigate to="/admin/dashboard" replace />} />','<Route path="seeded-turnamen" element={isAdmin ? <SeededTurnamenIO /> : <Navigate to="/admin/dashboard" replace />} />');
fs.writeFileSync(p,s,'utf8');
console.log('[patch-seeded-turnamen-io] enabled seeded import/export wrapper');
