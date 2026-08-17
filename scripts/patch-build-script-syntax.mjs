import fs from 'node:fs';

const file = 'scripts/patch-popup-admin-stable-order.mjs';
let source = fs.readFileSync(file, 'utf8');

// Normalize build-time source templates before Node parses the stable-order patch.
// 1) Remove the nested template literal that previously caused SyntaxError.
// 2) Keep new popup ids compatible with the UUID primary key in Supabase.
source = source.replace(
  /title:\s*\\`Dipindah ke Urutan\s*\\\$\{targetIndex \+ 1\}\\`/g,
  "title: 'Dipindah ke Urutan ' + (targetIndex + 1)"
);
source = source.replace(
  "const newId = editingId || ('popup-' + Date.now());",
  "const newId = editingId || crypto.randomUUID();"
);

fs.writeFileSync(file, source, 'utf8');
console.log('[build-script-syntax] normalized popup admin patch syntax and UUID creation');
