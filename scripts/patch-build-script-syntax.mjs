import fs from 'node:fs';

const file = 'scripts/patch-popup-admin-stable-order.mjs';
let source = fs.readFileSync(file, 'utf8');

// Fix nested template-literal syntax inside the build-time source template.
// The generated TSX does not need a nested template literal here.
source = source.replace(
  /title:\s*\\`Dipindah ke Urutan\s*\\\$\{targetIndex \+ 1\}\\`/g,
  "title: 'Dipindah ke Urutan ' + (targetIndex + 1)"
);

fs.writeFileSync(file, source, 'utf8');
console.log('[build-script-syntax] normalized popup admin patch template syntax');
