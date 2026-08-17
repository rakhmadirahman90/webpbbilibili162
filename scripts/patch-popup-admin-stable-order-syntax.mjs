import fs from 'node:fs';

const file = 'scripts/patch-popup-admin-stable-order.mjs';
let source = fs.readFileSync(file, 'utf8');

// The stable-order patch is itself a template literal. Keep the generated
// SweetAlert title as ordinary string concatenation so nested backticks can
// never terminate the patch script during Netlify/Vercel prebuild.
const fixed = source.replace(
  /title: [^\n]*Dipindah ke Urutan[^\n]*/,
  "title: 'Dipindah ke Urutan ' + (targetIndex + 1), showConfirmButton: false, timer: 1200 });\\n    } catch (err: any) {"
);

if (fixed !== source) {
  fs.writeFileSync(file, fixed);
  console.log('[popup-admin-stable-order-syntax] fixed');
} else {
  console.log('[popup-admin-stable-order-syntax] already valid');
}
