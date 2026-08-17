import fs from 'node:fs';

const file = 'scripts/patch-popup-admin-stable-order.mjs';
let source = fs.readFileSync(file, 'utf8');

// The stable-order patch is itself a template literal. Replace the nested
// backtick expression before Node parses that patch script.
const bt = String.fromCharCode(96);
const bs = String.fromCharCode(92);
const bad = 'title: ' + bs + bs + bt + 'Dipindah ke Urutan ' + bs + bs + '${targetIndex + 1}' + bs + bs + bt + ', showConfirmButton: false, timer: 1200 });' + bs + 'n    } catch';
const good = "title: 'Dipindah ke Urutan ' + (targetIndex + 1), showConfirmButton: false, timer: 1200 });" + bs + 'n    } catch';

if (source.includes(bad)) {
  source = source.replace(bad, good);
  fs.writeFileSync(file, source);
  console.log('[popup-admin-stable-order-syntax] fixed');
} else {
  console.log('[popup-admin-stable-order-syntax] already valid');
}
