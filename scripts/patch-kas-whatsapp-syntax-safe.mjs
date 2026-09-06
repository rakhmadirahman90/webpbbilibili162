import fs from 'node:fs';

const path = 'src/components/PublicKasView.tsx';
let source = fs.readFileSync(path, 'utf8');

// Some build-time report generators can emit a real newline between the
// quotes of join('\n'), which makes TSX fail with "Unterminated string literal".
// Normalize only that malformed construct; do not touch normal empty-string joins.
const before = source;
source = source.replace(/\.join\('\r?\n'\)/g, ".join('\\n')");

if (source !== before) {
  fs.writeFileSync(path, source, 'utf8');
  console.log('[patch-kas-whatsapp-syntax-safe] repaired malformed join newline literals');
} else {
  console.log('[patch-kas-whatsapp-syntax-safe] no malformed join newline literals found');
}
