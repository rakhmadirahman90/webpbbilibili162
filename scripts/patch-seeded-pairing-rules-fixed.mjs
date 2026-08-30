import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
if (!fs.existsSync(path)) process.exit(0);
let s = fs.readFileSync(path, 'utf8');

// Keep the existing v3 pairing implementation as the source of truth.
// This patch only repairs any legacy malformed helper that could break the build.
s = s.replace(/return \\\\`Kombinasi level \\\\$\\\\\{l1\\\\\} \+ \\\\$\\\\\{l2\\\\\} tidak diperbolehkan pada kategori ini\\\. \\\\$\\\\\{pairRuleText\(category\)\\\\\}\\\\`;/g,
  "return 'Kombinasi level ' + l1 + ' + ' + l2 + ' tidak diperbolehkan pada kategori ini. ' + pairRuleText(category);");

fs.writeFileSync(path, s);
console.log('[pairing-fixed] legacy pairing helper repaired safely');
