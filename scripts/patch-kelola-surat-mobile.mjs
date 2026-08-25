import fs from 'node:fs';
const path='src/components/KelolaSurat.tsx';
let s=fs.readFileSync(path,'utf8');
const root='w-full h-full flex flex-col justify-between p-2.5 sm:p-5 md:p-8 space-y-2.5 sm:space-y-4 md:space-y-6 overflow-hidden md:overflow-visible min-h-0 select-none';
if(!s.includes('kelola-surat-page')){
  if(!s.includes(root)) throw new Error('KelolaSurat root marker not found');
  s=s.replace(root,`${root} kelola-surat-page`);
  fs.writeFileSync(path,s);
}
console.log('[patch-kelola-surat-mobile] responsive class applied');
